import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUsers } from '@/lib/notify';

// GET /api/groups/chat-listings/organize — every pending listing sent into
// this admin's own group chat, auto-clustered by crop type so they see
// "62kg of maize from 5 members" instead of a flat feed they'd have to
// mentally sort themselves.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: listings, error } = await (supabase.from as any)('group_chat_listings')
    .select('id, sender_id, sender_name, crop_type, quantity_kg, notes, created_at')
    .eq('admin_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[/api/groups/chat-listings/organize GET]', error);
    return NextResponse.json({ error: 'Failed to load listings. Please try again.' }, { status: 500 });
  }

  const clusters = new Map<string, { cropType: string; totalKg: number; memberCount: number; listings: any[] }>();
  for (const l of (listings ?? []) as any[]) {
    const key = l.crop_type;
    if (!clusters.has(key)) clusters.set(key, { cropType: key, totalKg: 0, memberCount: 0, listings: [] });
    const c = clusters.get(key)!;
    c.totalKg += Number(l.quantity_kg);
    c.memberCount += 1;
    c.listings.push(l);
  }

  return NextResponse.json({ clusters: [...clusters.values()].sort((a, b) => b.totalKg - a.totalKg) });
}

// POST /api/groups/chat-listings/organize — publish one crop cluster into a
// real group_listings row (the same table the /groups dashboard's
// "Collective Listings" panel already reads from), then mark the underlying
// chat listings organized so they drop out of the pending queue.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cropType, askingPrice, notes } = await req.json();
  if (!cropType) return NextResponse.json({ error: 'cropType is required' }, { status: 400 });
  if (!askingPrice || isNaN(+askingPrice) || +askingPrice <= 0) {
    return NextResponse.json({ error: 'Enter a valid asking price per kg' }, { status: 400 });
  }

  const { data: myProfile } = await supabase.from('profiles').select('full_name, location').eq('user_id', user.id).single();
  if (!(myProfile as any)?.location) {
    return NextResponse.json({ error: 'Set your district in Business Profile before publishing a listing' }, { status: 400 });
  }

  const { data: pending, error: pendingErr } = await (supabase.from as any)('group_chat_listings')
    .select('id, sender_id, quantity_kg')
    .eq('admin_id', user.id)
    .eq('crop_type', cropType)
    .eq('status', 'pending');

  if (pendingErr) {
    console.error('[/api/groups/chat-listings/organize POST]', pendingErr);
    return NextResponse.json({ error: 'Failed to load listings. Please try again.' }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ error: `No pending ${cropType} listings to publish` }, { status: 400 });
  }

  const totalKg = pending.reduce((s: number, p: any) => s + Number(p.quantity_kg), 0);

  const { data: listing, error: listingErr } = await (supabase.from as any)('group_listings').insert({
    admin_id:          user.id,
    crop_type:         cropType,
    total_quantity_kg: totalKg,
    asking_price:      +askingPrice,
    district:          (myProfile as any).location,
    notes:             notes || null,
    member_count:      new Set(pending.map((p: any) => p.sender_id)).size,
    status:            'active',
  }).select().single();

  if (listingErr || !listing) {
    console.error('[/api/groups/chat-listings/organize POST]', listingErr);
    return NextResponse.json({ error: 'Failed to publish listing. Please try again.' }, { status: 500 });
  }

  const listingIds = pending.map((p: any) => p.id);
  await (supabase.from as any)('group_chat_listings')
    .update({ status: 'organized' })
    .in('id', listingIds);

  try {
    const senderIds: string[] = Array.from(new Set<string>(pending.map((p: any) => p.sender_id)));
    const notifRows = senderIds.map(userId => ({
      userId,
      role: 'farmer',
      type: 'group',
      title: 'Your listing is now published',
      body: `${cropType} · ${totalKg}kg lot published by your group leader. You'll be paid when it sells.`,
      url: '/groups/chat',
    }));
    if (notifRows.length > 0) await notifyUsers(supabase, notifRows);
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data: listing }, { status: 201 });
}
