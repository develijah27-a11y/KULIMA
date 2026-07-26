import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// Buyer accepts a farmer's counter-offer on a listing.
// Client sends { listingId } — we look up the buyer's 'countered' offer on that listing.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ success: false, error: 'listingId required' }, { status: 400 });

  // Find this buyer's countered offer on the listing
  const { data: offer, error: offerErr } = await (supabase.from as any)('offers')
    .select('id, listing_id, buyer_id, status')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .eq('status', 'countered')
    .maybeSingle();

  if (offerErr) {
    console.error('[/api/offers/accept-counter]', offerErr);
    return NextResponse.json({ success: false, error: 'Failed to look up the counter-offer.' }, { status: 500 });
  }
  if (!offer) return NextResponse.json({ success: false, error: 'No pending counter-offer found on this listing' }, { status: 404 });

  const { data: listing } = await (supabase.from as any)('listings')
    .select('id, quantity_kg').eq('id', listingId).single();
  if (!listing) return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });

  // Atomic claim — same guard as the PATCH /api/offers accept/accept-counter
  // actions, so this route can't double-sell a listing either.
  const stockAdmin = createServiceRoleClient();
  const { data: claimed } = await (stockAdmin as any).rpc('claim_listing_stock', {
    p_listing_id: listing.id,
    p_quantity_kg: listing.quantity_kg,
  });
  if (!claimed) {
    return NextResponse.json({ success: false, error: 'This listing is no longer available — it may have already been sold.' }, { status: 409 });
  }

  // Accept this offer, reject others
  await Promise.all([
    (supabase.from as any)('offers').update({ status: 'accepted' }).eq('id', offer.id),
    (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', listingId).neq('id', offer.id),
  ]);

  return NextResponse.json({ success: true });
}
