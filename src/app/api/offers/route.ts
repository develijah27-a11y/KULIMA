import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listingId');

  const supabase = await createClient();
  let q = supabase.from('offers').select('*, buyer:profiles(name,phone,business_name,rating)');
  if (listingId) q = q.eq('listing_id', listingId);
  const { data } = await q;

  return NextResponse.json({ success: true, data: (data ?? []).map((o: any) => ({ id: o.id, listingId: o.listing_id, buyerId: o.buyer_id, offeredPrice: +o.offered_price, status: o.status, buyerName: o.buyer?.name, buyerPhone: o.buyer?.phone, createdAt: o.created_at })) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, buyerId, offeredPrice } = body;
    if (!listingId || !buyerId || !offeredPrice) return NextResponse.json({ success: false, error: { message: 'Missing fields' } }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { data: listing } = await supabase.from('listings').select('asking_price').eq('id', listingId).single();
    if (!listing) return NextResponse.json({ success: false, error: { message: 'Listing not found' } }, { status: 404 });

    const minOffer = ((listing as any).asking_price ?? 0) * 0.7;
    if (+offeredPrice < minOffer) return NextResponse.json({ success: false, error: { message: `Offer below minimum allowed: UGX ${Math.round(minOffer)}` } }, { status: 400 });

    await supabase.from('offers').insert({ listing_id: listingId, buyer_id: user.id, offered_price: +offeredPrice, status: 'pending' });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ success: false }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { data: offer } = await supabase.from('offers').update({ status }).eq('id', id).select('listing_id').single();
    if (status === 'accepted' && offer) {
      await Promise.all([
        supabase.from('listings').update({ status: 'sold' }).eq('id', (offer as any).listing_id),
        supabase.from('offers').update({ status: 'rejected' }).eq('listing_id', (offer as any).listing_id).neq('id', id),
      ]);
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}
