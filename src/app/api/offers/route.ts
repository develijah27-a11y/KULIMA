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
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json(
    { success: true, data: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { listingId, offeredPrice, notes } = await req.json();
  if (!listingId || !offeredPrice) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
  }

  const { data: listing } = await (supabase.from as any)('listings').select('asking_price, status').eq('id', listingId).single();
  if (!listing || listing.status !== 'active') {
    return NextResponse.json({ success: false, error: 'Listing not available' }, { status: 404 });
  }

  const minOffer = (listing.asking_price ?? 0) * 0.7;
  if (+offeredPrice < minOffer) {
    return NextResponse.json({
      success: false,
      error: `Minimum offer is UGX ${Math.round(minOffer).toLocaleString()} (70% of asking price)`,
    }, { status: 400 });
  }

  // Prevent duplicate pending offer from same buyer
  const { data: existing } = await (supabase.from as any)('offers')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'countered'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ success: false, error: 'You already have an active offer on this listing' }, { status: 409 });
  }

  const { data, error } = await (supabase.from as any)('offers').insert({
    listing_id:    listingId,
    buyer_id:      user.id,
    offered_price: +offeredPrice,
    message:       notes ?? null,
    status:        'pending',
  }).select().single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
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
    // Mark this offer accepted, reject all others on same listing
    await Promise.all([
      (supabase.from as any)('offers').update({ status: 'accepted' }).eq('id', id),
      (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', offer.listing_id).neq('id', id),
      (supabase.from as any)('listings').update({ status: 'sold' }).eq('id', offer.listing_id),
    ]);
  } else if (action === 'reject') {
    await (supabase.from as any)('offers').update({ status: 'rejected', farmer_note: farmerNote ?? null }).eq('id', id);
  } else if (action === 'counter') {
    if (!counterPrice) return NextResponse.json({ success: false, error: 'Counter price required' }, { status: 400 });
    await (supabase.from as any)('offers').update({
      status: 'countered',
      counter_price: +counterPrice,
      farmer_note: farmerNote ?? null,
    }).eq('id', id);
  } else if (action === 'accept-counter') {
    // Buyer accepts farmer's counter price
    await Promise.all([
      (supabase.from as any)('offers').update({ status: 'accepted' }).eq('id', id),
      (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', offer.listing_id).neq('id', id),
      (supabase.from as any)('listings').update({ status: 'sold' }).eq('id', offer.listing_id),
    ]);
  } else {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
