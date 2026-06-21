import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { calcFare, type DeliveryType } from '@/lib/delivery-pricing';

// ─── GET: list open deliveries for transporters to browse ────────────────────
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const district = searchParams.get('district') ?? '';
  const cargo    = searchParams.get('cargo') ?? '';
  const type     = searchParams.get('type') ?? '';
  const status   = searchParams.get('status') ?? 'open';

  let query = (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, pickup_location, dropoff_location, delivery_type, estimated_fare, driver_earnings, distance_km, notes, status, created_at')
    .order('pickup_date', { ascending: true });

  if (status) query = query.eq('status', status);
  if (district) query = query.eq('pickup_district', district);
  if (cargo)    query = query.ilike('cargo_type', `%${cargo}%`);
  if (type)     query = query.eq('delivery_type', type);

  const { data, error } = await query.limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, deliveries: data });
}

// ─── POST: create delivery request + auto-match nearby drivers ────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    offer_id,
    pickup_district, pickup_location,
    dropoff_district, dropoff_location,
    cargo_kg, cargo_type,
    pickup_date, notes,
    delivery_type = 'standard',
  } = body;

  if (!pickup_district || !dropoff_district || !cargo_kg || !pickup_date) {
    return NextResponse.json({ error: 'pickup_district, dropoff_district, cargo_kg, pickup_date are required' }, { status: 400 });
  }
  if (!['cold', 'fast', 'standard'].includes(delivery_type)) {
    return NextResponse.json({ error: 'delivery_type must be cold, fast, or standard' }, { status: 400 });
  }

  // Calculate fare automatically based on route + type + weight
  const fare = calcFare(pickup_district, dropoff_district, parseFloat(cargo_kg), delivery_type as DeliveryType);

  const { data, error } = await (supabase.from as any)('delivery_requests').insert({
    offer_id:         offer_id ?? null,
    requester_id:     user.id,
    pickup_district,
    pickup_location:  pickup_location || pickup_district,
    dropoff_district,
    dropoff_location: dropoff_location || dropoff_district,
    cargo_kg:         parseFloat(cargo_kg),
    cargo_type:       cargo_type ?? null,
    pickup_date,
    notes:            notes ?? null,
    delivery_type,
    estimated_fare:   fare.totalFare,
    distance_km:      fare.distanceKm,
    commission_rate:  10,
    commission_amount: fare.commissionAmount,
    driver_earnings:  fare.driverEarnings,
    status:           'open',
    payment_status:   'pending',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deliveryId = data.id;

  // Auto-match: find available verified drivers operating in the pickup district
  // Use service role to read across RLS boundaries
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let driversNotified = 0;
  try {
    let vehicleQuery = (admin.from as any)('vehicles')
      .select('user_id')
      .eq('is_available', true)
      .contains('districts', [pickup_district]);

    if (delivery_type === 'cold') vehicleQuery = vehicleQuery.eq('is_cold_capable', true);

    const { data: matchedVehicles } = await vehicleQuery.limit(10);

    if (matchedVehicles && matchedVehicles.length > 0) {
      const driverUserIds: string[] = [...new Set<string>(matchedVehicles.map((v: any) => v.user_id as string))];
      driversNotified = driverUserIds.length;

      const assignments = driverUserIds.map((driverId: string) => ({
        delivery_id: deliveryId,
        driver_id:   driverId,
        status:      'pending',
      }));
      await (admin.from as any)('driver_assignments').insert(assignments).select('id');

      const { data: driverProfiles } = await (admin.from as any)('profiles')
        .select('id, user_id')
        .in('user_id', driverUserIds);

      if (driverProfiles && driverProfiles.length > 0) {
        const typeLabel = delivery_type === 'cold' ? '❄️ Cold' : delivery_type === 'fast' ? '⚡ Fast' : '🚛 Standard';
        const notifications = driverProfiles.map((p: any) => ({
          farmer_id: p.id,
          type:      'delivery',
          title:     'New Delivery Request',
          body:      `${typeLabel} · ${cargo_kg}kg from ${pickup_district} → ${dropoff_district} · UGX ${fare.totalFare.toLocaleString()}`,
          read:      false,
        }));
        await (admin.from as any)('notifications').insert(notifications);
      }
    }
  } catch {
    // Driver matching is non-critical — delivery is already created
  }

  return NextResponse.json({ success: true, deliveryId, fare, driversNotified });
}

// ─── PATCH: update delivery status ───────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  // Transporter marks cargo as picked up (assigned → in_transit)
  if (action === 'start_transit') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'in_transit', picked_up_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'assigned');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Transporter marks delivery as done (in_transit → delivered)
  if (action === 'complete') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'delivered', delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'in_transit');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the requester that their goods have arrived
    try {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: delivery } = await (admin.from as any)('delivery_requests')
        .select('requester_id, estimated_fare')
        .eq('id', id)
        .single();

      if (delivery?.requester_id) {
        const { data: requesterProfile } = await (admin.from as any)('profiles')
          .select('id')
          .eq('user_id', delivery.requester_id)
          .single();

        if (requesterProfile) {
          await (admin.from as any)('notifications').insert({
            farmer_id: requesterProfile.id,
            type:      'delivery',
            title:     'Delivery Arrived!',
            body:      `Your goods have been delivered. Please confirm and pay UGX ${Number(delivery.estimated_fare).toLocaleString()} to release the driver.`,
            read:      false,
          });
        }
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true });
  }

  // Requester cancels (any status before in_transit)
  if (action === 'cancel') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('requester_id', user.id)
      .not('status', 'in', '("in_transit","delivered")');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
