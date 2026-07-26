import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notify';

type Params = { params: Promise<{ id: string }> };

// Transporter accepts a delivery job
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify transporter role — 'transporter' can be either the account's
  // primary role or a secondary one held alongside another (this app is
  // one-account-multiple-roles; the /transporter layout itself gates on the
  // `roles` array for exactly this reason), so admin must accept both.
  const { data: profile } = await supabase
    .from('profiles').select('role, roles, verification_level, role_verification_levels').eq('user_id', user.id).single();
  const isTransporter = (profile as any)?.role === 'transporter' || ((profile as any)?.roles ?? []).includes('transporter');
  if (!profile || !(isTransporter || (profile as any).role === 'admin')) {
    return NextResponse.json({ error: 'Only transporters can accept jobs' }, { status: 403 });
  }
  // Blue-tier verification is what actually collects a driving permit +
  // vehicle registration + selfie — require it before dispatch so a
  // misplaced delivery or bad-faith driver can always be traced. Prefer the
  // transporter-ROLE level (role_verification_levels.transporter) over the
  // flat column — an account whose primary role isn't 'transporter' only
  // ever gets its transporter approval written there (see
  // /api/admin/verify-kyc), so checking the flat column alone wrongly
  // re-blocked an already-verified secondary-role transporter.
  const level = (profile as any).role_verification_levels?.transporter ?? (profile as any).verification_level;
  if (isTransporter && level !== 'blue' && level !== 'gold') {
    return NextResponse.json({
      error: 'Submit your driving license, vehicle registration, and a selfie for verification before accepting jobs.',
    }, { status: 403 });
  }

  // Use admin client for all DB writes to bypass RLS on delivery_requests
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Load the delivery request
  const { data: dr } = await (admin.from as any)('delivery_requests')
    .select('id, status, requester_id, requester_role, cargo_type, cargo_kg, pickup_district')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (dr.status !== 'open') return NextResponse.json({ error: 'Job is no longer available' }, { status: 409 });

  // Claim the job atomically — only succeeds if still open
  const { data: updated, error } = await (admin.from as any)('delivery_requests')
    .update({
      status:         'assigned',
      transporter_id: user.id,
      accepted_at:    new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'open')
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Job already taken — try another' }, { status: 409 });
  }

  // Cancel any pending driver_assignments for this delivery, then record ours
  await (admin.from as any)('driver_assignments')
    .update({ status: 'cancelled' })
    .eq('delivery_id', id)
    .neq('status', 'accepted');

  await (admin.from as any)('driver_assignments').upsert({
    delivery_id:  id,
    driver_id:    user.id,
    status:       'accepted',
    responded_at: new Date().toISOString(),
  }, { onConflict: 'delivery_id,driver_id' });

  // Update linked order status to 'dispatched'
  await (admin.from as any)('orders')
    .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
    .eq('delivery_request_id', id)
    .eq('status', 'paid');

  // Notify requester
  await notifyUser(admin, {
    userId: dr.requester_id,
    role:   dr.requester_role ?? null,
    type:   'delivery',
    title:  `Driver assigned — ${dr.cargo_type ?? 'cargo'}`,
    body:   `A transporter has accepted your delivery of ${dr.cargo_kg} kg from ${dr.pickup_district}.`,
    data:   { delivery_id: id },
    url:    dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
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

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: dr } = await (admin.from as any)('delivery_requests')
    .select('id, status, transporter_id, requester_id, requester_role, cargo_type, cargo_kg, estimated_fare')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (dr.transporter_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date().toISOString();

  if (action === 'pickup') {
    if (dr.status !== 'assigned') return NextResponse.json({ error: 'Cannot mark pickup at this stage' }, { status: 400 });
    await (admin.from as any)('delivery_requests').update({ status: 'in_transit', picked_up_at: now }).eq('id', id);
    await (admin.from as any)('orders')
      .update({ status: 'in_transit', in_transit_at: now })
      .eq('delivery_request_id', id);
    await notifyUser(admin, {
      userId: dr.requester_id,
      role:   dr.requester_role ?? null,
      type:   'delivery',
      title:  `Your ${dr.cargo_type} is on the way!`,
      body:   `The transporter has picked up your ${dr.cargo_kg} kg.`,
      data:   { delivery_id: id },
      url:    dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
    });
  } else if (action === 'deliver') {
    if (dr.status !== 'in_transit') return NextResponse.json({ error: 'Must be in transit first' }, { status: 400 });
    await (admin.from as any)('delivery_requests').update({ status: 'delivered', delivered_at: now }).eq('id', id);
    await (admin.from as any)('orders')
      .update({ status: 'delivered', delivered_at: now })
      .eq('delivery_request_id', id);
    await notifyUser(admin, {
      userId: dr.requester_id,
      role:   dr.requester_role ?? null,
      type:   'delivery',
      title:  `Delivered — ${dr.cargo_type}`,
      body:   dr.estimated_fare
        ? `Your ${dr.cargo_kg} kg of ${dr.cargo_type} has arrived. Confirm receipt to release payment to the farmer, and pay UGX ${Math.round(Number(dr.estimated_fare)).toLocaleString()} to release the driver's earnings.`
        : `Your ${dr.cargo_kg} kg of ${dr.cargo_type} has been delivered. Please confirm receipt.`,
      data:   { delivery_id: id },
      url:    dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
    });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
