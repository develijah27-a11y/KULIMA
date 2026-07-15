import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { calcFare, type DeliveryType } from '@/lib/delivery-pricing';
import { sendPushToUsers } from '@/lib/push';

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
  if (error) {
    console.error('[/api/deliveries GET]', error);
    return NextResponse.json({ error: 'Failed to load deliveries. Please try again.' }, { status: 500 });
  }
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

  if (error) {
    console.error('[/api/deliveries POST]', error);
    return NextResponse.json({ error: 'Failed to create delivery request. Please try again.' }, { status: 500 });
  }

  const deliveryId = data.id;

  // Auto-match: find available verified drivers operating in the pickup district
  // Use service role to read across RLS boundaries
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let driversNotified = 0;
  try {
    const cargoKgNum = parseFloat(cargo_kg);

    function baseVehicleQuery() {
      let q = (admin.from as any)('vehicles')
        .select('user_id')
        .eq('is_available', true)
        .gte('capacity_kg', cargoKgNum);
      if (delivery_type === 'cold') q = q.eq('is_cold_capable', true);
      return q;
    }

    // Primary match: available, right-sized vehicles actually operating in
    // the pickup district. `districts` is a text[] of districts a
    // transporter covers — `.contains` maps to Postgres `@>`.
    let { data: matchedVehicles } = await baseVehicleQuery()
      .contains('districts', [pickup_district])
      .limit(50);

    // Fallback: nobody covers that exact district (small/rural area, or a
    // transporter just hasn't added it to their coverage list yet) — still
    // notify other available, right-sized drivers nationwide rather than
    // silently notifying no one. The open-jobs browse/bid flow is the
    // ultimate safety net regardless, but a push notification reaches
    // drivers who aren't actively browsing.
    if (!matchedVehicles || matchedVehicles.length === 0) {
      const res = await baseVehicleQuery().limit(50);
      matchedVehicles = res.data;
    }

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
          user_id: p.user_id,
          type:    'delivery',
          title:   'New Delivery Request',
          body:    `${typeLabel} · ${cargo_kg}kg from ${pickup_district} → ${dropoff_district} · UGX ${fare.totalFare.toLocaleString()}`,
          read:    false,
        }));
        await (admin.from as any)('notifications').insert(notifications);
        await sendPushToUsers(driverUserIds, {
          title: 'New Delivery Request',
          body:  `${typeLabel} · ${cargo_kg}kg from ${pickup_district} → ${dropoff_district} · UGX ${fare.totalFare.toLocaleString()}`,
          url:   '/transporter/job-queue',
          tag:   `delivery-${deliveryId}`,
        });
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
    if (error) {
      console.error('[/api/deliveries PATCH start_transit]', error);
      return NextResponse.json({ error: 'Failed to start transit. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Transporter marks delivery as done (in_transit → delivered)
  if (action === 'complete') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'delivered', delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'in_transit');
    if (error) {
      console.error('[/api/deliveries PATCH complete]', error);
      return NextResponse.json({ error: 'Failed to complete delivery. Please try again.' }, { status: 500 });
    }

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
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          type:    'delivery',
          title:   'Delivery Arrived!',
          body:    `Your goods have been delivered. Please confirm and pay UGX ${Number(delivery.estimated_fare).toLocaleString()} to release the driver.`,
          read:    false,
        });
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
    if (error) {
      console.error('[/api/deliveries PATCH cancel]', error);
      return NextResponse.json({ error: 'Failed to cancel delivery. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
