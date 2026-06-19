import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// Transporter accepts a delivery job
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify transporter role
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['transporter', 'admin'].includes((profile as any).role)) {
    return NextResponse.json({ error: 'Only transporters can accept jobs' }, { status: 403 });
  }

  // Load the delivery request
  const { data: dr } = await (supabase.from as any)('delivery_requests')
    .select('id, status, requester_id, cargo_type, cargo_kg, pickup_district')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (dr.status !== 'open') return NextResponse.json({ error: 'Job is no longer available' }, { status: 409 });

  // Claim the job (optimistic lock via conditional update)
  const { data: updated, error } = await (supabase.from as any)('delivery_requests')
    .update({
      status:           'assigned',
      transporter_id:   user.id,
      accepted_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'open')   // only succeeds if still open
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Job already taken — try another' }, { status: 409 });
  }

  // Cancel all pending driver_assignments for this delivery
  await (supabase.from as any)('driver_assignments')
    .update({ status: 'cancelled' })
    .eq('delivery_id', id)
    .neq('status', 'accepted');

  // Upsert accepted assignment record
  await (supabase.from as any)('driver_assignments').upsert({
    delivery_id:  id,
    driver_id:    user.id,
    status:       'accepted',
    responded_at: new Date().toISOString(),
  }, { onConflict: 'delivery_id,driver_id' });

  // Update linked order status to 'dispatched'
  await (supabase.from as any)('orders')
    .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
    .eq('delivery_request_id', id)
    .eq('status', 'confirmed');

  // Notify requester (buyer)
  await (supabase.from as any)('notifications').insert({
    user_id: dr.requester_id,
    type:    'delivery',
    title:   `Driver assigned — ${dr.cargo_type}`,
    body:    `A transporter has accepted your delivery of ${dr.cargo_kg} kg from ${dr.pickup_district}.`,
    data:    { delivery_id: id },
  });

  return NextResponse.json({ success: true });
}

// Transporter updates delivery status (picked up / delivered)
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json();

  const { data: dr } = await (supabase.from as any)('delivery_requests')
    .select('id, status, transporter_id, requester_id, cargo_type, cargo_kg')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (dr.transporter_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date().toISOString();

  if (action === 'pickup') {
    if (dr.status !== 'assigned') return NextResponse.json({ error: 'Cannot mark pickup at this stage' }, { status: 400 });
    await (supabase.from as any)('delivery_requests').update({ status: 'in_transit', picked_up_at: now }).eq('id', id);
    await (supabase.from as any)('orders')
      .update({ status: 'in_transit', in_transit_at: now })
      .eq('delivery_request_id', id);
    await (supabase.from as any)('notifications').insert({
      user_id: dr.requester_id,
      type:    'delivery',
      title:   `Your ${dr.cargo_type} is on the way!`,
      body:    `The transporter has picked up your ${dr.cargo_kg} kg.`,
      data:    { delivery_id: id },
    });
  } else if (action === 'deliver') {
    if (dr.status !== 'in_transit') return NextResponse.json({ error: 'Must be in transit first' }, { status: 400 });
    await (supabase.from as any)('delivery_requests').update({ status: 'delivered', delivered_at: now }).eq('id', id);
    await (supabase.from as any)('orders')
      .update({ status: 'delivered', delivered_at: now })
      .eq('delivery_request_id', id);
    await (supabase.from as any)('notifications').insert({
      user_id: dr.requester_id,
      type:    'delivery',
      title:   `Delivered — ${dr.cargo_type}`,
      body:    `Your ${dr.cargo_kg} kg of ${dr.cargo_type} has been delivered. Please confirm receipt.`,
      data:    { delivery_id: id },
    });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
