import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { releaseEscrowForOrder, refundEscrowForOrder } from '@/lib/orders/escrow';

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

    // No delivery request yet — a transporter must not be dispatchable until
    // the buyer has actually paid into escrow. Funding escrow (POST
    // /api/wallet/escrow action=fund) is what creates the delivery request;
    // see that route for the pickup/matching logic that used to live here.
    await (supabase.from as any)('notifications').insert({
      user_id: order.buyer_id,
      role:    'buyer',
      type:    'order',
      title:   `Order confirmed — ${order.crop_type}`,
      body:    `${(farmerProfile as any).full_name ?? 'Farmer'} confirmed your order for ${order.quantity_kg} kg. Pay now to arrange delivery.`,
      data:    { order_id: id },
    });

    return NextResponse.json({ success: true });
  }

  // ── Farmer or Buyer: cancel ───────────────────────────────────────────────
  if (action === 'cancel') {
    const isFarmer = farmerProfile && (farmerProfile as any).user_id === user.id;
    const isBuyer  = order.buyer_id === user.id;
    if (!isFarmer && !isBuyer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!['pending', 'confirmed', 'paid'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot cancel at this stage' }, { status: 400 });
    }

    await (supabase.from as any)('orders')
      .update({ status: 'cancelled', cancelled_at: now, farmer_note: note ?? null })
      .eq('id', id);

    // Restore listing to active if it was marked sold from a Buy Now
    await (supabase.from as any)('listings').update({ status: 'active' }).eq('id', order.listing_id).eq('status', 'sold');

    // Refund escrow to the buyer if it was already funded — otherwise a
    // cancelled order silently kept the buyer's money locked forever.
    if (order.escrow_id) {
      const admin = createServiceRoleClient();
      await refundEscrowForOrder(admin as any, id);
    }

    // Notify the other party
    if (isFarmer) {
      await (supabase.from as any)('notifications').insert({
        user_id: order.buyer_id,
        role:    'buyer',
        type:    'order',
        title:   `Order cancelled — ${order.crop_type}`,
        body:    `Your order was cancelled by the farmer. ${note ?? ''}`,
        data:    { order_id: id },
      });
    } else {
      await (supabase.from as any)('notifications').insert({
        farmer_id: order.farmer_profile_id,
        user_id:   (farmerProfile as any)?.user_id,
        role:      'farmer',
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

    if (order.escrow_id) {
      // Escrow was funded — release it now. This does the actual money
      // movement (credit seller/group members net of commission, credit the
      // platform wallet) and marks the order completed itself.
      const admin = createServiceRoleClient();
      const result = await releaseEscrowForOrder(admin as any, id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'Failed to release payment' }, { status: 500 });
      }
    } else {
      // No escrow was ever funded for this order — mark it completed but do
      // NOT claim payment was released, since none was ever collected.
      await (supabase.from as any)('orders')
        .update({ status: 'completed', completed_at: now })
        .eq('id', id);

      if (farmerProfile) {
        await (supabase.from as any)('notifications').insert({
          farmer_id: order.farmer_profile_id,
          user_id:   (farmerProfile as any).user_id,
          role:      'farmer',
          type:      'order',
          title:     `Order marked complete — ${order.crop_type}`,
          body:      `${(buyerProfile as any)?.full_name ?? 'Buyer'} confirmed receipt of ${order.crop_type} (${order.quantity_kg} kg). No escrow payment was recorded on this order — contact support if payment is outstanding.`,
          data:      { order_id: id },
        });
      }
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
