import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, note } = body;
  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

  // Load order
  const { data: order } = await (supabase.from as any)('orders')
    .select('id, buyer_id, farmer_profile_id, status, crop_type, quantity_kg, total_amount, listing_id, pickup_district, dropoff_district, delivered_at, escrow_id, return_requested_at')
    .eq('id', id)
    .single();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Load farmer profile for this order
  const { data: farmerProfile } = await supabase
    .from('profiles').select('id, user_id, full_name').eq('id', order.farmer_profile_id).single();
  const { data: buyerProfile } = await supabase
    .from('profiles').select('full_name').eq('user_id', order.buyer_id).single();

  const now = new Date().toISOString();

  // ── Farmer: confirm ───────────────────────────────────────────────────────
  if (action === 'confirm') {
    if (!farmerProfile || (farmerProfile as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });
    }

    await (supabase.from as any)('orders')
      .update({ status: 'confirmed', confirmed_at: now, farmer_note: note ?? null })
      .eq('id', id);

    // Create delivery request
    const { data: dr } = await (supabase.from as any)('delivery_requests').insert({
      requester_id:     order.buyer_id,
      pickup_district:  order.pickup_district,
      dropoff_district: order.dropoff_district ?? 'Kampala',
      cargo_kg:         order.quantity_kg,
      cargo_type:       order.crop_type,
      pickup_date:      new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      status:           'open',
      delivery_type:    'standard',
      notes:            `Order #${id.slice(0,8)} — ${order.crop_type}`,
    }).select().single();

    if (dr) {
      await (supabase.from as any)('orders').update({ delivery_request_id: (dr as any).id }).eq('id', id);
    }

    // Notify buyer
    await (supabase.from as any)('notifications').insert({
      user_id: order.buyer_id,
      type:    'order',
      title:   `Order confirmed — ${order.crop_type}`,
      body:    `${(farmerProfile as any).full_name ?? 'Farmer'} confirmed your order for ${order.quantity_kg} kg. A transporter will be assigned soon.`,
      data:    { order_id: id },
    });

    return NextResponse.json({ success: true });
  }

  // ── Farmer or Buyer: cancel ───────────────────────────────────────────────
  if (action === 'cancel') {
    const isFarmer = farmerProfile && (farmerProfile as any).user_id === user.id;
    const isBuyer  = order.buyer_id === user.id;
    if (!isFarmer && !isBuyer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot cancel at this stage' }, { status: 400 });
    }

    await (supabase.from as any)('orders')
      .update({ status: 'cancelled', cancelled_at: now, farmer_note: note ?? null })
      .eq('id', id);

    // Restore listing to active if it was marked sold from a Buy Now
    await (supabase.from as any)('listings').update({ status: 'active' }).eq('id', order.listing_id).eq('status', 'sold');

    // Notify the other party
    if (isFarmer) {
      await (supabase.from as any)('notifications').insert({
        user_id: order.buyer_id,
        type:    'order',
        title:   `Order cancelled — ${order.crop_type}`,
        body:    `Your order was cancelled by the farmer. ${note ?? ''}`,
        data:    { order_id: id },
      });
    } else {
      await (supabase.from as any)('notifications').insert({
        farmer_id: order.farmer_profile_id,
        user_id:   (farmerProfile as any)?.user_id,
        type:      'order',
        title:     `Order cancelled by buyer — ${order.crop_type}`,
        body:      `The buyer cancelled their order for ${order.quantity_kg} kg.`,
        data:      { order_id: id },
      });
    }

    return NextResponse.json({ success: true });
  }

  // ── Buyer: confirm receipt (complete) ─────────────────────────────────────
  if (action === 'complete') {
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order not yet marked as delivered' }, { status: 400 });
    }

    await (supabase.from as any)('orders')
      .update({ status: 'completed', completed_at: now })
      .eq('id', id);

    // Notify farmer — payment released
    if (farmerProfile) {
      await (supabase.from as any)('notifications').insert({
        farmer_id: order.farmer_profile_id,
        user_id:   (farmerProfile as any).user_id,
        type:      'payment',
        title:     `Payment released — UGX ${Math.round(order.total_amount).toLocaleString()}`,
        body:      `${(buyerProfile as any)?.full_name ?? 'Buyer'} confirmed receipt of ${order.crop_type} (${order.quantity_kg} kg).`,
        data:      { order_id: id },
      });
    }

    return NextResponse.json({ success: true });
  }

  // ── Buyer: raise dispute / request return ─────────────────────────────────
  if (action === 'dispute') {
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Can only raise a dispute on a delivered order' }, { status: 400 });
    }

    // Enforce 48-hour return window from delivery
    if (order.delivered_at) {
      const deliveredMs = new Date(order.delivered_at).getTime();
      const windowMs    = 48 * 60 * 60 * 1000;
      if (Date.now() - deliveredMs > windowMs) {
        return NextResponse.json({ error: 'The 48-hour return window has expired. Confirm receipt to release payment.' }, { status: 400 });
      }
    }

    await (supabase.from as any)('orders').update({
      status:              'disputed',
      disputed_at:         now,
      return_requested_at: now,
    }).eq('id', id);

    // Freeze escrow
    if (order.escrow_id) {
      await (supabase.from as any)('escrow_accounts').update({ status: 'disputed' }).eq('id', order.escrow_id);
    }

    // Create dispute record for admin review
    await (supabase.from as any)('disputes').insert({
      complainant_id: user.id,
      respondent_id:  (farmerProfile as any)?.user_id ?? null,
      order_id:       id,
      reason:         'return_request',
      description:    `Buyer raised a dispute on ${order.crop_type} (${order.quantity_kg} kg, UGX ${Math.round(order.total_amount).toLocaleString()}).${note ? ` Note: ${note}` : ''}`,
      status:         'open',
    });

    // Alert admin
    await (supabase.from as any)('notifications').insert({
      type:  'alert',
      title: `Return/dispute on order #${id.slice(0, 8)}`,
      body:  `Buyer raised a dispute on ${order.crop_type} (${order.quantity_kg} kg). Admin review required.`,
      data:  { order_id: id },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
