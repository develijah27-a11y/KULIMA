import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') ?? 'buyer';

  if (role === 'farmer') {
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data, error } = await (supabase.from as any)('orders')
      .select(`
        id, crop_type, quantity_kg, unit_price, total_amount, status,
        buyer_note, farmer_note, pickup_district, dropoff_district,
        confirmed_at, dispatched_at, delivered_at, completed_at, cancelled_at, created_at,
        listing:listings(id, crop_type, quantity_kg, asking_price, district),
        buyer:profiles!inner(full_name, location)
      `)
      .eq('farmer_profile_id', (profile as any).id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // Buyer view
  const { data, error } = await (supabase.from as any)('orders')
    .select(`
      id, crop_type, quantity_kg, unit_price, total_amount, status,
      buyer_note, farmer_note, pickup_district, dropoff_district,
      confirmed_at, dispatched_at, in_transit_at, delivered_at, completed_at, cancelled_at, created_at,
      listing:listings(id, crop_type, district),
      farmer:profiles!farmer_profile_id(full_name, location)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { listingId, quantityKg, note } = body;
  if (!listingId || !quantityKg || isNaN(+quantityKg) || +quantityKg <= 0) {
    return NextResponse.json({ error: 'listingId and quantityKg are required' }, { status: 400 });
  }

  // Load listing
  const { data: listing } = await (supabase.from as any)('listings')
    .select('id, farmer_id, crop_type, quantity_kg, asking_price, district, status')
    .eq('id', listingId)
    .single();

  if (!listing || listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is not available' }, { status: 404 });
  }
  if (+quantityKg > listing.quantity_kg) {
    return NextResponse.json({
      error: `Only ${listing.quantity_kg} kg available on this listing`,
    }, { status: 400 });
  }

  // Prevent duplicate pending order from same buyer on same listing
  const { data: existing } = await (supabase.from as any)('orders')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'confirmed', 'dispatched', 'in_transit'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already have an active order for this listing' }, { status: 409 });
  }

  // Get buyer profile for dropoff district
  const { data: buyerProfile } = await supabase
    .from('profiles').select('full_name, location').eq('user_id', user.id).single();

  const total = Math.round(+quantityKg * listing.asking_price);

  // Create order
  const { data: order, error: orderErr } = await (supabase.from as any)('orders').insert({
    listing_id:         listingId,
    buyer_id:           user.id,
    farmer_profile_id:  listing.farmer_id,
    crop_type:          listing.crop_type,
    quantity_kg:        +quantityKg,
    unit_price:         listing.asking_price,
    total_amount:       total,
    status:             'pending',
    buyer_note:         note ?? null,
    pickup_district:    listing.district,
    dropoff_district:   (buyerProfile as any)?.location ?? null,
  }).select().single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  // Notify farmer
  const { data: farmerProfile } = await supabase
    .from('profiles').select('user_id').eq('id', listing.farmer_id).single();

  if (farmerProfile) {
    await (supabase.from as any)('notifications').insert({
      farmer_id: listing.farmer_id,
      user_id:   (farmerProfile as any).user_id,
      type:      'order',
      title:     `New order: ${listing.crop_type} · ${+quantityKg} kg`,
      body:      `${(buyerProfile as any)?.full_name ?? 'A buyer'} placed an order for UGX ${total.toLocaleString()}. Confirm to proceed.`,
      data:      { order_id: (order as any).id, listing_id: listingId },
    });
  }

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
