import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/submissions
// Leader: every pending submission for the group (for the organize screen).
// Member: just their own submissions (pending + published history).
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: group } = await (supabase.from as any)('farmer_groups').select('leader_id').eq('id', groupId).single();
  const isLeader = group?.leader_id === myProfile.id;

  let query = (supabase.from as any)('group_listing_submissions')
    .select('id, farmer_id, crop_type, quantity_kg, notes, photo_url, status, created_at, farmer:profiles(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  query = isLeader ? query.eq('status', 'pending') : query.eq('farmer_id', myProfile.id);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/groups/[id]/submissions GET]', error);
    return NextResponse.json({ error: 'Failed to load submissions. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ submissions: data ?? [], isLeader });
}

// POST /api/groups/[id]/submissions — a member submits their own contribution.
// No photo required — the whole point is to lower the bar for members who
// can't easily photograph produce before it's collected.
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: membership } = await (supabase.from as any)('farmer_group_members')
    .select('id').eq('group_id', groupId).eq('farmer_id', myProfile.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });

  const { cropType, quantityKg, notes, photoUrl } = await req.json();
  if (!cropType) return NextResponse.json({ error: 'Select a crop' }, { status: 400 });
  if (!quantityKg || isNaN(+quantityKg) || +quantityKg <= 0) {
    return NextResponse.json({ error: 'Enter a valid quantity in kg' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('group_listing_submissions').insert({
    group_id:    groupId,
    farmer_id:   myProfile.id,
    crop_type:   cropType,
    quantity_kg: +quantityKg,
    notes:       notes || null,
    photo_url:   photoUrl || null,
  }).select().single();

  if (error) {
    console.error('[/api/groups/[id]/submissions POST]', error);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }

  // Let the leader know a new submission is waiting to be organized.
  try {
    const { data: group } = await (supabase.from as any)('farmer_groups').select('name, leader_id').eq('id', groupId).single();
    if (group) {
      const { data: leaderProfile } = await supabase.from('profiles').select('user_id').eq('id', group.leader_id).single();
      if (leaderProfile) {
        await notifyUser(supabase, {
          userId: (leaderProfile as any).user_id,
          role: 'groups',
          type: 'group',
          title: 'New produce submission',
          body: `A member submitted ${quantityKg}kg of ${cropType} for ${group.name}. Ready to organize into a listing.`,
          url: '/groups/listings/create',
        });
      }
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
