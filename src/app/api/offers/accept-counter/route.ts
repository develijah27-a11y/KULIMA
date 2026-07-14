import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Accept this offer, reject others, mark listing sold
  await Promise.all([
    (supabase.from as any)('offers').update({ status: 'accepted' }).eq('id', offer.id),
    (supabase.from as any)('offers').update({ status: 'rejected' }).eq('listing_id', listingId).neq('id', offer.id),
    (supabase.from as any)('listings').update({ status: 'sold' }).eq('id', listingId),
  ]);

  return NextResponse.json({ success: true });
}
