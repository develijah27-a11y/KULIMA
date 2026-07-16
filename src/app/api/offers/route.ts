import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listingId');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let q = (supabase.from as any)('offers').select('*');
  if (listingId) {
    // Only the listing's farmer may view all offers on that listing
    const profile = await getOrCreateProfile(supabase, user);
    if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });
    const { data: listing } = await (supabase.from as any)('listings')
      .select('farmer_id')
      .eq('id', listingId)
      .single();
    if (!listing || listing.farmer_id !== profile.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    q = q.eq('listing_id', listingId);
  } else {
    q = q.eq('buyer_id', user.id);
  }
  q = q.order('created_at', { ascending: false }).limit(50);

  const { data, error } = await q;
  if (error) {
    console.error('[/api/offers]', error);
    return NextResponse.json({ success: false, error: 'Failed to load offers. Please try again.' }, { status: 500 });
  }
  return NextResponse.json(
    { success: true, data: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  );
}

// Price negotiation is retired — listings sell at the farmer's set price
// (the same price the market-rate guidance helped them choose when posting).
// This endpoint stays only to let GET/PATCH resolve any offers that were
// already in flight when this changed; no new ones can be created.
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Price negotiation is no longer available on AgriNova. Listings are sold at the price set by the farmer — use Buy Now instead.',
  }, { status: 410 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id, action, counterPrice, farmerNote } = await req.json();
  if (!id || !action) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

  const { data: offer } = await (supabase.from as any)('offers')
    .select('id, listing_id, buyer_id, status')
    .eq('id', id)
    .single();
  if (!offer) return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });

  if (action === 'accept' || action === 'reject' || action === 'counter') {
    // Farmer-only actions — verify caller owns the listing
    const profile = await getOrCreateProfile(supabase, user);
    if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });
    const { data: listing } = await (supabase.from as any)('listings')
      .select('farmer_id')
      .eq('id', offer.listing_id)
      .single();
    if (!listing || listing.farmer_id !== profile.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  } else if (action === 'accept-counter') {
    // Buyer action — verify caller owns this offer
    if (offer.buyer_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  if (action === 'accept') {
    // Load listing details for order creation
    const { data: listing } = await (supabase.from as any)('listings')
      .select('id, farmer_id, crop_type, quantity_kg, asking_price, district')
      .eq('id', offer.listing_id)
      .single();

    // Mark this offer accepted, reject all others on same listing
    await Promise.all([
      (supabase.from as any)('offers').update({ status: 'accepted', farmer_note: farmerNote ?? null }).eq('id', id),
      (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', offer.listing_id).neq('id', id),
      (supabase.from as any)('listings').update({ status: 'sold' }).eq('id', offer.listing_id),
    ]);

    if (listing) {
      // Get buyer location for delivery district
      const { data: buyerProfile } = await supabase
        .from('profiles').select('full_name, location').eq('user_id', offer.buyer_id).single();
      const agreedPrice = offer.counter_price ?? offer.offered_price ?? listing.asking_price;
      const total = Math.round(listing.quantity_kg * agreedPrice);

      // Create order (already confirmed — both parties agreed via negotiation)
      const { data: newOrder } = await (supabase.from as any)('orders').insert({
        listing_id:         offer.listing_id,
        offer_id:           offer.id,
        buyer_id:           offer.buyer_id,
        farmer_profile_id:  listing.farmer_id,
        crop_type:          listing.crop_type,
        quantity_kg:        listing.quantity_kg,
        unit_price:         agreedPrice,
        total_amount:       total,
        status:             'confirmed',
        confirmed_at:       new Date().toISOString(),
        pickup_district:    listing.district,
        dropoff_district:   (buyerProfile as any)?.location ?? null,
      }).select().single();

      // Create delivery request
      if (newOrder) {
        const { data: dr } = await (supabase.from as any)('delivery_requests').insert({
          requester_id:     offer.buyer_id,
          pickup_district:  listing.district,
          dropoff_district: (buyerProfile as any)?.location ?? 'Kampala',
          cargo_kg:         listing.quantity_kg,
          cargo_type:       listing.crop_type,
          pickup_date:      new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          status:           'open',
          delivery_type:    'standard',
          notes:            `Order from offer — ${listing.crop_type}`,
        }).select().single();

        if (dr) {
          await (supabase.from as any)('orders').update({ delivery_request_id: (dr as any).id }).eq('id', (newOrder as any).id);
        }
      }

      // Notify buyer
      const { data: farmerProf } = await supabase
        .from('profiles').select('full_name').eq('id', listing.farmer_id).single();
      await (supabase.from as any)('notifications').insert({
        user_id: offer.buyer_id,
        role:    'buyer',
        type:    'offer',
        title:   `Offer accepted — ${listing.crop_type}`,
        body:    `${(farmerProf as any)?.full_name ?? 'Farmer'} accepted your offer of UGX ${agreedPrice.toLocaleString()}/kg. Your order is confirmed!`,
        data:    { offer_id: id, order_id: (newOrder as any)?.id },
      });
    }
  } else if (action === 'reject') {
    await (supabase.from as any)('offers').update({ status: 'rejected', farmer_note: farmerNote ?? null }).eq('id', id);
    // Notify buyer
    await (supabase.from as any)('notifications').insert({
      user_id: offer.buyer_id,
      role:    'buyer',
      type:    'offer',
      title:   'Offer declined',
      body:    farmerNote ? `The farmer declined your offer: "${farmerNote}"` : 'The farmer declined your offer.',
      data:    { offer_id: id },
    });
  } else if (action === 'counter') {
    if (!counterPrice) return NextResponse.json({ success: false, error: 'Counter price required' }, { status: 400 });
    await (supabase.from as any)('offers').update({
      status: 'countered',
      counter_price: +counterPrice,
      farmer_note: farmerNote ?? null,
    }).eq('id', id);
    // Notify buyer about counter offer
    await (supabase.from as any)('notifications').insert({
      user_id: offer.buyer_id,
      role:    'buyer',
      type:    'offer',
      title:   'Counter offer received',
      body:    `The farmer countered at UGX ${Number(counterPrice).toLocaleString()}/kg. ${farmerNote ?? ''}`,
      data:    { offer_id: id, counter_price: counterPrice },
    });
  } else if (action === 'accept-counter') {
    // Buyer accepts farmer's counter price — re-runs the same accept logic
    const { data: listing } = await (supabase.from as any)('listings')
      .select('id, farmer_id, crop_type, quantity_kg, district')
      .eq('id', offer.listing_id).single();

    await Promise.all([
      (supabase.from as any)('offers').update({ status: 'accepted' }).eq('id', id),
      (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', offer.listing_id).neq('id', id),
      (supabase.from as any)('listings').update({ status: 'sold' }).eq('id', offer.listing_id),
    ]);

    if (listing) {
      const agreedPrice = offer.counter_price ?? offer.offered_price;
      const total = Math.round(listing.quantity_kg * agreedPrice);
      const { data: buyerProfile } = await supabase
        .from('profiles').select('location').eq('user_id', offer.buyer_id).single();

      await (supabase.from as any)('orders').insert({
        listing_id:         offer.listing_id,
        offer_id:           offer.id,
        buyer_id:           offer.buyer_id,
        farmer_profile_id:  listing.farmer_id,
        crop_type:          listing.crop_type,
        quantity_kg:        listing.quantity_kg,
        unit_price:         agreedPrice,
        total_amount:       total,
        status:             'confirmed',
        confirmed_at:       new Date().toISOString(),
        pickup_district:    listing.district,
        dropoff_district:   (buyerProfile as any)?.location ?? null,
      });

      const { data: farmerProf } = await supabase
        .from('profiles').select('user_id, full_name').eq('id', listing.farmer_id).single();
      if (farmerProf) {
        await (supabase.from as any)('notifications').insert({
          farmer_id: listing.farmer_id,
          user_id:   (farmerProf as any).user_id,
          role:      'farmer',
          type:      'offer',
          title:     'Counter offer accepted!',
          body:      `Your counter of UGX ${agreedPrice.toLocaleString()}/kg was accepted. Order confirmed for ${listing.quantity_kg} kg.`,
          data:      { offer_id: id },
        });
      }
    }
  } else {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
