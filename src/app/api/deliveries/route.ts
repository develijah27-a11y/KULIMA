import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { calcFare, type DeliveryType } from '@/lib/delivery-pricing';
import { sendPushToUsers } from '@/lib/push';
import { sendEmail, deliveryArrivedEmail } from '@/lib/email';
import { logSystemEvent } from '@/lib/system-log';
import { notifyNearbyDrivers } from '@/lib/notify-drivers';

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
    .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, pickup_location, dropoff_location, delivery_type, estimated_fare, driver_earnings, distance_km, notes, status, created_at, requester:profiles!delivery_requests_requester_profile_fkey(full_name, phone_number, location)')
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
    pickup_district, pickup_location, pickup_lat, pickup_lng,
    dropoff_district, dropoff_location, dropoff_lat, dropoff_lng,
    cargo_kg, cargo_type,
    pickup_date, notes,
    delivery_type = 'standard',
  } = body;

  const validCoord = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v) && v >= -90 && v <= 90;
  const validLng = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v) && v >= -180 && v <= 180;

  if (!pickup_district || !dropoff_district || !cargo_kg || !pickup_date) {
    return NextResponse.json({ error: 'pickup_district, dropoff_district, cargo_kg, pickup_date are required' }, { status: 400 });
  }
  if (!['cold', 'fast', 'standard'].includes(delivery_type)) {
    return NextResponse.json({ error: 'delivery_type must be cold, fast, or standard' }, { status: 400 });
  }

  // Fairness backstop: don't let someone book a new driver while they've
  // already left a driver unpaid for 24h+ on a past job — that driver did
  // the work and is still waiting. /api/deliveries/timeout independently
  // reminds/flags the overdue one; this just stops it from happening twice.
  const overdueSince = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: overdueUnpaid } = await (supabase.from as any)('delivery_requests')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', user.id)
    .eq('status', 'delivered')
    .eq('payment_status', 'pending')
    .lt('delivered_at', overdueSince);

  if (overdueUnpaid && overdueUnpaid > 0) {
    return NextResponse.json({
      error: 'You have a completed delivery with payment still pending past 24 hours. Please settle the driver fare on your existing delivery before posting a new one.',
      code: 'DELIVERY_PAYMENT_OVERDUE',
    }, { status: 402 });
  }

  // Calculate fare automatically based on route + type + weight
  const fare = calcFare(pickup_district, dropoff_district, parseFloat(cargo_kg), delivery_type as DeliveryType);

  const { data: userProfile } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  const requesterRole = body.requester_role || userProfile?.role || 'buyer';

  const { data, error } = await (supabase.from as any)('delivery_requests').insert({
    requester_id:     user.id,
    requester_role:   requesterRole,
    offer_id:         offer_id ?? null,
    pickup_district,
    pickup_location:  pickup_location || pickup_district,
    pickup_lat:       validCoord(pickup_lat) && validLng(pickup_lng) ? pickup_lat : null,
    pickup_lng:       validCoord(pickup_lat) && validLng(pickup_lng) ? pickup_lng : null,
    dropoff_district,
    dropoff_location: dropoff_location || dropoff_district,
    dropoff_lat:      validCoord(dropoff_lat) && validLng(dropoff_lng) ? dropoff_lat : null,
    dropoff_lng:      validCoord(dropoff_lat) && validLng(dropoff_lng) ? dropoff_lng : null,
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

  // Auto-match: find and notify ALL nearby verified drivers operating in the area
  // Use service role to read across RLS boundaries
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let driversNotified = 0;
  try {
    const notifyRes = await notifyNearbyDrivers(admin, {
      deliveryId,
      pickupDistrict: pickup_district,
      dropoffDistrict: dropoff_district,
      cargoKg: parseFloat(cargo_kg),
      cargoType: cargo_type || null,
      deliveryType: delivery_type,
      driverEarnings: fare.driverEarnings,
      totalFare: fare.totalFare,
      pickupLat: pickup_lat,
      pickupLng: pickup_lng,
      excludeUserId: user.id,
    });
    driversNotified = notifyRes.driversNotified;
  } catch (err) {
    console.error('[/api/deliveries POST notifyNearbyDrivers]', err);
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

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. DRIVER SETS OFF TO PICKUP (assigned -> heading_to_pickup)
  if (action === 'start_pickup_trip') {
    // Graceful update: include trip_phase & started_pickup_at
    const updatePayload: Record<string, any> = {
      trip_phase: 'heading_to_pickup',
      started_pickup_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await (admin.from as any)('delivery_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'assigned');

    if (error && error.message?.includes('column')) {
      // If trip_phase column not yet present in unmigrated database
      const fallback = await (admin.from as any)('delivery_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('transporter_id', user.id)
        .eq('status', 'assigned');
      error = fallback.error;
    }

    if (error) {
      console.error('[/api/deliveries PATCH start_pickup_trip]', error);
      return NextResponse.json({ error: 'Failed to start trip to pickup. Please try again.' }, { status: 500 });
    }

    // Send human-written live update to requester
    try {
      const [{ data: delivery }, { data: driverProfile }] = await Promise.all([
        (admin.from as any)('delivery_requests').select('requester_id, requester_role, cargo_type, pickup_district, pickup_location').eq('id', id).single(),
        admin.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
      ]);

      if (delivery?.requester_id) {
        const driverName = (driverProfile as any)?.full_name ?? 'Your driver';
        const loc = delivery.pickup_location ? `${delivery.pickup_location}, ${delivery.pickup_district}` : delivery.pickup_district;
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          role: delivery.requester_role || 'buyer',
          type: 'delivery',
          title: 'Driver on the way to pickup',
          body: `${driverName} has set off and is heading to collect the ${delivery.cargo_type || 'produce'} from ${loc}. Live map tracking is now active.`,
          read: false,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, trip_phase: 'heading_to_pickup' });
  }

  // 2. DRIVER ARRIVED AT PICKUP POINT (heading_to_pickup -> arrived_pickup)
  if (action === 'arrive_pickup') {
    const updatePayload: Record<string, any> = {
      trip_phase: 'arrived_pickup',
      arrived_pickup_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await (admin.from as any)('delivery_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'assigned');

    if (error && error.message?.includes('column')) {
      const fallback = await (admin.from as any)('delivery_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('transporter_id', user.id);
      error = fallback.error;
    }

    if (error) {
      console.error('[/api/deliveries PATCH arrive_pickup]', error);
      return NextResponse.json({ error: 'Failed to record arrival at pickup.' }, { status: 500 });
    }

    try {
      const { data: delivery } = await (admin.from as any)('delivery_requests')
        .select('requester_id, requester_role, cargo_type, pickup_district, pickup_location')
        .eq('id', id)
        .single();

      if (delivery?.requester_id) {
        const loc = delivery.pickup_location ? `${delivery.pickup_location}, ${delivery.pickup_district}` : delivery.pickup_district;
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          role: delivery.requester_role || 'buyer',
          type: 'delivery',
          title: 'Driver arrived at pickup location',
          body: `Your driver has arrived at ${loc} and is currently checking and loading your cargo.`,
          read: false,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, trip_phase: 'arrived_pickup' });
  }

  // 3. CARGO LOADED & TRIP TO DELIVERY STARTS (assigned -> in_transit)
  if (action === 'start_transit' || action === 'start_delivery_trip') {
    const updatePayload: Record<string, any> = {
      status: 'in_transit',
      trip_phase: 'in_transit',
      picked_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await (admin.from as any)('delivery_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'assigned');

    if (error && error.message?.includes('column')) {
      const fallback = await (admin.from as any)('delivery_requests')
        .update({ status: 'in_transit', picked_up_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('transporter_id', user.id)
        .eq('status', 'assigned');
      error = fallback.error;
    }

    if (error) {
      console.error('[/api/deliveries PATCH start_transit]', error);
      return NextResponse.json({ error: 'Failed to start transit. Please try again.' }, { status: 500 });
    }

    try {
      const { data: delivery } = await (admin.from as any)('delivery_requests')
        .select('requester_id, requester_role, cargo_type, cargo_kg, dropoff_district, dropoff_location')
        .eq('id', id)
        .single();

      if (delivery?.requester_id) {
        const dest = delivery.dropoff_location ? `${delivery.dropoff_location}, ${delivery.dropoff_district}` : delivery.dropoff_district;
        const cargoDesc = delivery.cargo_kg ? `${delivery.cargo_kg}kg of ${delivery.cargo_type || 'produce'}` : (delivery.cargo_type || 'cargo');
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          role: delivery.requester_role || 'buyer',
          type: 'delivery',
          title: 'Cargo loaded — on the road to destination',
          body: `Your ${cargoDesc} has been securely loaded. The driver is now travelling towards ${dest}.`,
          read: false,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, trip_phase: 'in_transit' });
  }

  // 4. DRIVER REACHES DROPOFF LOCATION (in_transit -> arrived_delivery)
  if (action === 'arrive_dropoff') {
    const updatePayload: Record<string, any> = {
      trip_phase: 'arrived_delivery',
      arrived_delivery_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await (admin.from as any)('delivery_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'in_transit');

    if (error && error.message?.includes('column')) {
      const fallback = await (admin.from as any)('delivery_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('transporter_id', user.id);
      error = fallback.error;
    }

    if (error) {
      console.error('[/api/deliveries PATCH arrive_dropoff]', error);
      return NextResponse.json({ error: 'Failed to record arrival at delivery.' }, { status: 500 });
    }

    try {
      const { data: delivery } = await (admin.from as any)('delivery_requests')
        .select('requester_id, requester_role, dropoff_district, dropoff_location')
        .eq('id', id)
        .single();

      if (delivery?.requester_id) {
        const dest = delivery.dropoff_location ? `${delivery.dropoff_location}, ${delivery.dropoff_district}` : delivery.dropoff_district;
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          role: delivery.requester_role || 'buyer',
          type: 'delivery',
          title: 'Driver arrived with your delivery',
          body: `Your driver has arrived at ${dest}. Please meet them to inspect your produce and receive the delivery.`,
          read: false,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, trip_phase: 'arrived_delivery' });
  }

  // 5. TRANSPORTER COMPLETES DELIVERY (in_transit / arrived_delivery -> delivered)
  if (action === 'complete') {
    const updatePayload: Record<string, any> = {
      status: 'delivered',
      trip_phase: 'delivered',
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await (admin.from as any)('delivery_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('transporter_id', user.id)
      .eq('status', 'in_transit');

    if (error && error.message?.includes('column')) {
      const fallback = await (admin.from as any)('delivery_requests')
        .update({ status: 'delivered', delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('transporter_id', user.id)
        .eq('status', 'in_transit');
      error = fallback.error;
    }

    if (error) {
      console.error('[/api/deliveries PATCH complete]', error);
      return NextResponse.json({ error: 'Failed to complete delivery. Please try again.' }, { status: 500 });
    }

    // Free the vehicle the moment the job is physically done
    await (admin.from as any)('vehicles')
      .update({ is_available: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // Notify the requester that their goods have arrived
    try {
      const { data: delivery } = await (admin.from as any)('delivery_requests')
        .select(`
          requester_id, requester_role, estimated_fare, cargo_type, cargo_kg,
          pickup_district, pickup_location, dropoff_district, dropoff_location,
          delivery_type, distance_km, picked_up_at, delivered_at,
          transporter_id, assigned_vehicle_id
        `)
        .eq('id', id)
        .single();

      if (delivery?.requester_id) {
        await (admin.from as any)('notifications').insert({
          user_id: delivery.requester_id,
          role:    delivery.requester_role || 'buyer',
          type:    'delivery',
          title:   'Delivery completed successfully',
          body:    `All items have been delivered safely. Please inspect the produce and release payment of UGX ${Number(delivery.estimated_fare).toLocaleString()} to your driver.`,
          read:    false,
        });

        // Thank-you email with delivery details
        const [{ data: authUser }, { data: requesterProfile }, { data: driverProfile }, { data: vehicle }] = await Promise.all([
          admin.auth.admin.getUserById(delivery.requester_id),
          admin.from('profiles').select('full_name, phone_number').eq('user_id', delivery.requester_id).maybeSingle(),
          delivery.transporter_id
            ? admin.from('profiles').select('full_name, phone_number').eq('user_id', delivery.transporter_id).maybeSingle()
            : Promise.resolve({ data: null }),
          delivery.assigned_vehicle_id
            ? (admin.from as any)('vehicles').select('make_model, plate_number').eq('id', delivery.assigned_vehicle_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (authUser?.user?.email) {
          await sendEmail(
            authUser.user.email,
            'Your Cropify delivery has arrived',
            deliveryArrivedEmail({
              recipientName:    (requesterProfile as any)?.full_name ?? 'there',
              recipientPhone:   (requesterProfile as any)?.phone_number ?? null,
              cargoType:        delivery.cargo_type,
              cargoKg:          delivery.cargo_kg,
              pickupDistrict:   delivery.pickup_district,
              pickupLocation:   delivery.pickup_location ?? null,
              dropoffDistrict:  delivery.dropoff_district,
              dropoffLocation:  delivery.dropoff_location ?? null,
              fare:             Number(delivery.estimated_fare ?? 0),
              distanceKm:       delivery.distance_km ?? null,
              deliveryType:     delivery.delivery_type ?? null,
              pickedUpAt:       delivery.picked_up_at ?? null,
              deliveredAt:      delivery.delivered_at,
              driverName:       (driverProfile as any)?.full_name ?? null,
              driverPhone:      (driverProfile as any)?.phone_number ?? null,
              vehicleMakeModel: (vehicle as any)?.make_model ?? null,
              vehiclePlate:     (vehicle as any)?.plate_number ?? null,
              receiptNo:        `CRP-${String(id).slice(0, 8).toUpperCase()}`,
            }),
          );
        }
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, trip_phase: 'delivered' });
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
