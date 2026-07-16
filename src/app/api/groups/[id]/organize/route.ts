import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

async function requireLeader(supabase: any, groupId: string, userId: string) {
  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  if (!myProfile) return null;
  const { data: group } = await supabase.from('farmer_groups').select('id, name, district, leader_id').eq('id', groupId).single();
  if (!group || group.leader_id !== myProfile.id) return null;
  return { myProfile, group };
}

// GET /api/groups/[id]/organize — pending submissions auto-clustered by crop
// type, so the leader sees "37kg of maize from 4 members" instead of a flat
// list they'd have to mentally group and re-type by hand.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireLeader(supabase, groupId, user.id);
  if (!ctx) return NextResponse.json({ error: 'Only the group leader can organize submissions' }, { status: 403 });

  const { data: submissions, error } = await (supabase.from as any)('group_listing_submissions')
    .select('id, farmer_id, crop_type, quantity_kg, notes, photo_url, created_at, farmer:profiles(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[/api/groups/[id]/organize GET]', error);
    return NextResponse.json({ error: 'Failed to load submissions. Please try again.' }, { status: 500 });
  }

  const clusters = new Map<string, { cropType: string; totalKg: number; memberCount: number; submissions: any[] }>();
  for (const s of (submissions ?? []) as any[]) {
    const key = s.crop_type;
    if (!clusters.has(key)) clusters.set(key, { cropType: key, totalKg: 0, memberCount: 0, submissions: [] });
    const c = clusters.get(key)!;
    c.totalKg += Number(s.quantity_kg);
    c.memberCount += 1;
    c.submissions.push(s);
  }

  return NextResponse.json({
    district: ctx.group.district,
    clusters: [...clusters.values()].sort((a, b) => b.totalKg - a.totalKg),
  });
}

// POST /api/groups/[id]/organize — publish one crop cluster into a real
// group_listings lot, copying every matching pending submission into
// group_listing_contributions so the eventual sale payout still splits
// proportionally by what each member actually contributed.
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireLeader(supabase, groupId, user.id);
  if (!ctx) return NextResponse.json({ error: 'Only the group leader can publish a listing' }, { status: 403 });

  const { cropType, askingPrice, notes } = await req.json();
  if (!cropType) return NextResponse.json({ error: 'cropType is required' }, { status: 400 });
  if (!askingPrice || isNaN(+askingPrice) || +askingPrice <= 0) {
    return NextResponse.json({ error: 'Enter a valid asking price per kg' }, { status: 400 });
  }
  if (!ctx.group.district) {
    return NextResponse.json({ error: 'This group has no district set — add one in group settings before publishing' }, { status: 400 });
  }

  const { data: pending, error: pendingErr } = await (supabase.from as any)('group_listing_submissions')
    .select('id, farmer_id, quantity_kg')
    .eq('group_id', groupId)
    .eq('crop_type', cropType)
    .eq('status', 'pending');

  if (pendingErr) {
    console.error('[/api/groups/[id]/organize POST]', pendingErr);
    return NextResponse.json({ error: 'Failed to load submissions. Please try again.' }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ error: `No pending ${cropType} submissions to publish` }, { status: 400 });
  }

  const totalKg = pending.reduce((s: number, p: any) => s + Number(p.quantity_kg), 0);

  const { data: listing, error: listingErr } = await (supabase.from as any)('group_listings').insert({
    admin_id:          user.id,
    crop_type:         cropType,
    total_quantity_kg: totalKg,
    asking_price:      +askingPrice,
    district:          ctx.group.district,
    notes:             notes || null,
    member_count:      pending.length,
    status:            'active',
    group_name:        ctx.group.name,
  }).select().single();

  if (listingErr || !listing) {
    console.error('[/api/groups/[id]/organize POST]', listingErr);
    return NextResponse.json({ error: 'Failed to publish listing. Please try again.' }, { status: 500 });
  }

  const contribRows = pending.map((p: any) => ({
    group_listing_id: listing.id,
    farmer_id:         p.farmer_id,
    quantity_kg:       p.quantity_kg,
  }));
  const { error: contribErr } = await (supabase.from as any)('group_listing_contributions').insert(contribRows);
  if (contribErr) {
    console.error('[/api/groups/[id]/organize POST]', contribErr);
    return NextResponse.json({ success: true, data: listing, warning: 'Listing published, but member contributions were not saved. Contact support before this sells.' }, { status: 201 });
  }

  const submissionIds = pending.map((p: any) => p.id);
  await (supabase.from as any)('group_listing_submissions')
    .update({ status: 'published', group_listing_id: listing.id })
    .in('id', submissionIds);

  // Tell each contributing member their submission is now live.
  try {
    const farmerIds: string[] = Array.from(new Set<string>(pending.map((p: any) => p.farmer_id)));
    const { data: profiles } = await supabase.from('profiles').select('id, user_id').in('id', farmerIds);
    const notifRows = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      role: 'farmer',
      type: 'group',
      title: 'Your submission is now listed',
      body: `${cropType} · ${totalKg}kg lot published for ${ctx.group.name}. You'll be paid when it sells.`,
      read: false,
    }));
    if (notifRows.length > 0) await (supabase.from as any)('notifications').insert(notifRows);
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data: listing }, { status: 201 });
}
