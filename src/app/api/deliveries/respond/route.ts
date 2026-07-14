import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

// Driver accepts or declines a delivery that was matched to them
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { delivery_id, action } = await req.json();
  if (!delivery_id) return NextResponse.json({ error: 'delivery_id required' }, { status: 400 });
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify this driver has a pending assignment for this delivery
  const { data: assignment, error: assignErr } = await (admin.from as any)('driver_assignments')
    .select('id')
    .eq('delivery_id', delivery_id)
    .eq('driver_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (assignErr || !assignment) {
    return NextResponse.json({ error: 'No pending assignment found for this delivery' }, { status: 404 });
  }

  // Verify delivery is still open (another driver hasn't already accepted)
  const { data: delivery } = await (admin.from as any)('delivery_requests')
    .select('id, status, estimated_fare, commission_amount, driver_earnings, requester_id, pickup_district, dropoff_district, cargo_kg, cargo_type, delivery_type')
    .eq('id', delivery_id)
    .single();

  if (!delivery || delivery.status !== 'open') {
    // Mark this assignment as expired since delivery is no longer available
    await (admin.from as any)('driver_assignments')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', assignment.id);
    return NextResponse.json({ error: 'Delivery is no longer available' }, { status: 409 });
  }

  // ── DECLINE ────────────────────────────────────────────────────────────────
  if (action === 'decline') {
    await (admin.from as any)('driver_assignments')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', assignment.id);
    return NextResponse.json({ success: true, message: 'Delivery declined' });
  }

  // ── ACCEPT ─────────────────────────────────────────────────────────────────
  // Must be verified at blue tier or above (driving license + vehicle
  // registration + selfie on file) before taking a job — so a misplaced
  // delivery or bad-faith driver can always be traced.
  const { data: driverProfile } = await (admin.from as any)('profiles')
    .select('verification_level').eq('user_id', user.id).single();
  if (!driverProfile || !['blue', 'gold'].includes(driverProfile.verification_level)) {
    return NextResponse.json({
      error: 'Submit your driving license, vehicle registration, and a selfie for verification before accepting jobs.',
    }, { status: 403 });
  }

  // Driver must have an available vehicle
  const { data: vehicle } = await (admin.from as any)('vehicles')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_available', true)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({
      error: 'No available vehicle found. Please register your vehicle or mark it as available.',
    }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Atomically: accept this assignment, cancel all other pending assignments for
  // this delivery, assign the delivery to this driver, mark vehicle as busy
  await Promise.all([
    (admin.from as any)('driver_assignments')
      .update({ status: 'accepted', responded_at: now })
      .eq('id', assignment.id),

    (admin.from as any)('driver_assignments')
      .update({ status: 'cancelled', responded_at: now })
      .eq('delivery_id', delivery_id)
      .neq('id', assignment.id)
      .eq('status', 'pending'),

    (admin.from as any)('delivery_requests')
      .update({
        status:              'assigned',
        transporter_id:      user.id,
        assigned_vehicle_id: vehicle.id,
        agreed_price:        delivery.estimated_fare,
        commission_amount:   delivery.commission_amount,
        driver_earnings:     delivery.driver_earnings,
        accepted_at:         now,
        updated_at:          now,
      })
      .eq('id', delivery_id)
      .eq('status', 'open'),

    (admin.from as any)('vehicles')
      .update({ is_available: false, updated_at: now })
      .eq('id', vehicle.id),
  ]);

  // Notify the requester that a driver is on their way
  try {
    const typeLabel = delivery.delivery_type === 'cold' ? '❄️ Cold' : delivery.delivery_type === 'fast' ? '⚡ Fast' : '🚛 Standard';

    await (admin.from as any)('notifications').insert({
      user_id: delivery.requester_id,
      type:    'delivery',
      title:   'Driver Accepted Your Delivery',
      body:    `${typeLabel} driver is on the way for your ${delivery.cargo_kg}kg shipment from ${delivery.pickup_district} → ${delivery.dropoff_district}.`,
      read:    false,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, message: 'Delivery accepted! Head to the pickup location.' });
}
