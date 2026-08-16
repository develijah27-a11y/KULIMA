import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { delivery_id, vehicle_id, price, message } = await req.json();
  if (!delivery_id || !vehicle_id || !price) {
    return NextResponse.json({ error: 'delivery_id, vehicle_id, price required' }, { status: 400 });
  }

  // Same blue/gold verification gate the two direct-accept routes
  // (/api/deliveries/[id]/accept, /api/deliveries/respond) already enforce —
  // this route was the one path that let an unverified transporter win a
  // real job, since only vehicle ownership was checked below.
  const { data: driverProfile } = await (supabase.from as any)('profiles')
    .select('verification_level, role_verification_levels').eq('user_id', user.id).single();
  const driverLevel = driverProfile?.role_verification_levels?.transporter ?? driverProfile?.verification_level;
  if (!driverProfile || !['blue', 'gold'].includes(driverLevel)) {
    return NextResponse.json({
      error: 'Submit your driving license, vehicle registration, and a selfie for verification before bidding on jobs.',
    }, { status: 403 });
  }

  // Verify transporter owns the vehicle
  const { data: vehicle } = await (supabase.from as any)('vehicles').select('id').eq('id', vehicle_id).eq('user_id', user.id).single();
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  const { data, error } = await (supabase.from as any)('delivery_bids').insert({
    delivery_id,
    transporter_id: user.id,
    vehicle_id,
    price,
    message: message ?? null,
    status: 'pending',
  }).select('id').single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'You already submitted a bid for this delivery' }, { status: 409 });
    console.error('[/api/deliveries/bids]', error);
    return NextResponse.json({ error: 'Failed to submit bid. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, bidId: data.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bid_id, action } = await req.json();
  if (!bid_id || !action) return NextResponse.json({ error: 'bid_id and action required' }, { status: 400 });

  if (action === 'accept') {
    // Only the delivery requester can accept a bid
    const { data: bid } = await (supabase.from as any)('delivery_bids')
      .select('*, delivery:delivery_requests(id, requester_id, pickup_district, dropoff_district, cargo_kg)')
      .eq('id', bid_id)
      .single();

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    if (bid.delivery?.requester_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const dr = bid.delivery as any;
    const route = dr ? `${dr.cargo_kg}kg from ${dr.pickup_district} → ${dr.dropoff_district}` : 'your delivery';

    // Claim the delivery atomically — unlike the two direct-accept routes,
    // this had no status guard at all, so a double-click or two near-
    // simultaneous bid acceptances could each report success and race each
    // other to assign the job. .eq('status','open') + checking a row was
    // actually returned makes the claim atomic; bail out cleanly if someone
    // else's accept (or an auto-cancel) already won the race.
    const { data: claimed } = await (supabase.from as any)('delivery_requests')
      .update({
        status: 'assigned',
        transporter_id: bid.transporter_id,
        assigned_vehicle_id: bid.vehicle_id,
        agreed_price: bid.price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bid.delivery_id)
      .eq('status', 'open')
      .select('id');

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'This delivery is no longer available.' }, { status: 409 });
    }

    // Accept this bid, reject others, lock the winning vehicle, notify winner
    await Promise.all([
      (supabase.from as any)('delivery_bids').update({ status: 'accepted' }).eq('id', bid_id),
      (supabase.from as any)('delivery_bids').update({ status: 'rejected' }).eq('delivery_id', bid.delivery_id).neq('id', bid_id),
      (supabase.from as any)('vehicles').update({ is_available: false, updated_at: new Date().toISOString() }).eq('id', bid.vehicle_id),
      notifyUser(supabase, {
        userId: bid.transporter_id,
        role: 'transporter',
        type: 'delivery',
        title: 'Your bid was accepted!',
        body: `The farmer accepted your bid of UGX ${Number(bid.price).toLocaleString()} for ${route}. Head to My Deliveries to coordinate pickup.`,
        url: '/transporter/active',
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  if (action === 'withdraw') {
    const { error } = await (supabase.from as any)('delivery_bids')
      .update({ status: 'withdrawn' })
      .eq('id', bid_id)
      .eq('transporter_id', user.id)
      .eq('status', 'pending');
    if (error) {
      console.error('[/api/deliveries/bids]', error);
      return NextResponse.json({ error: 'Failed to withdraw bid. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
