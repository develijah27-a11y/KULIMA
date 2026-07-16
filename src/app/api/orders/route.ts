import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

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

    if (error) {
      console.error('[/api/orders]', error);
      return NextResponse.json({ error: 'Failed to load orders. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }

  // Buyer view
  const { data, error } = await (supabase.from as any)('orders')
    .select(`
      id, crop_type, quantity_kg, unit_price, total_amount, status,
      buyer_note, farmer_note, pickup_district, dropoff_district,
      confirmed_at, dispatched_at, in_transit_at, delivered_at, completed_at,
      cancelled_at, disputed_at, return_requested_at, created_at,
      listing:listings(id, crop_type, district),
      farmer:profiles!farmer_profile_id(full_name, location)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[/api/orders]', error);
    return NextResponse.json({ error: 'Failed to load orders. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { listingId, groupListingId, quantityKg, note } = body;

  if (!quantityKg || isNaN(+quantityKg) || +quantityKg <= 0) {
    return NextResponse.json({ error: 'quantityKg is required' }, { status: 400 });
  }
  if (!listingId && !groupListingId) {
    return NextResponse.json({ error: 'listingId or groupListingId is required' }, { status: 400 });
  }

  // Get buyer profile
  const { data: buyerProfile } = await supabase
    .from('profiles').select('id, full_name, location').eq('user_id', user.id).single();

  // ── GROUP LISTING ORDER ──────────────────────────────────────────────────────
  if (groupListingId) {
    const { data: gl } = await (supabase.from as any)('group_listings')
      .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, status')
      .eq('id', groupListingId)
      .single();

    if (!gl || gl.status !== 'active') {
      return NextResponse.json({ error: 'Group listing is not available' }, { status: 404 });
    }
    if (+quantityKg > gl.total_quantity_kg) {
      return NextResponse.json({
        error: `Only ${gl.total_quantity_kg} kg available in this group lot`,
      }, { status: 400 });
    }

    // Prevent duplicate active order from same buyer on same group listing
    const { data: existingGl } = await (supabase.from as any)('orders')
      .select('id')
      .eq('group_listing_id', groupListingId)
      .eq('buyer_id', user.id)
      .in('status', ['pending','confirmed','dispatched','in_transit','delivered'])
      .maybeSingle();
    if (existingGl) {
      return NextResponse.json({ error: 'You already have an active order for this group listing' }, { status: 409 });
    }

    const total = Math.round(+quantityKg * gl.asking_price);

    // Resolve group admin's profile id for farmer_profile_id
    const { data: adminProfile } = await supabase
      .from('profiles').select('id, user_id').eq('user_id', gl.admin_id).single();

    const { data: order, error: orderErr } = await (supabase.from as any)('orders').insert({
      group_listing_id:  groupListingId,
      buyer_id:          user.id,
      farmer_profile_id: adminProfile?.id ?? null,
      crop_type:         gl.crop_type,
      quantity_kg:       +quantityKg,
      unit_price:        gl.asking_price,
      total_amount:      total,
      status:            'pending',
      buyer_note:        note ?? null,
      pickup_district:   gl.district,
      dropoff_district:  (buyerProfile as any)?.location ?? null,
    }).select().single();

    if (orderErr) {
      console.error('[/api/orders]', orderErr);
      return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 500 });
    }

    // Notify group admin
    if (adminProfile) {
      await notifyUser(supabase, {
        userId: adminProfile.user_id,
        role:    'groups',
        type:    'order',
        title:   `New group order: ${gl.crop_type} · ${+quantityKg} kg`,
        body:    `${(buyerProfile as any)?.full_name ?? 'A buyer'} placed a bulk order for UGX ${total.toLocaleString()} from your group listing.`,
        data:    { order_id: (order as any).id, group_listing_id: groupListingId },
        url:     '/groups/listings',
      });
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  }

  // ── REGULAR LISTING ORDER ────────────────────────────────────────────────────
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
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

  if (orderErr) {
    console.error('[/api/orders]', orderErr);
    return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 500 });
  }

  // Notify farmer
  const { data: farmerProfile } = await supabase
    .from('profiles').select('user_id').eq('id', listing.farmer_id).single();

  if (farmerProfile) {
    await notifyUser(supabase, {
      userId:   (farmerProfile as any).user_id,
      role:      'farmer',
      type:      'order',
      title:     `New order: ${listing.crop_type} · ${+quantityKg} kg`,
      body:      `${(buyerProfile as any)?.full_name ?? 'A buyer'} placed an order for UGX ${total.toLocaleString()}. Confirm to proceed.`,
      data:      { order_id: (order as any).id, listing_id: listingId },
      url:       '/farmer/orders',
    });
  }

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
