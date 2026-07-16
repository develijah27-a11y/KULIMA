import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/members — list members with profiles
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('farmer_group_members')
    .select('id, role, joined_at, farmer:profiles(id, full_name, phone_number, district, avatar_url, primary_crop)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[/api/groups/[id]/members]', error);
    return NextResponse.json({ error: 'Failed to load group members. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ members: data ?? [] });
}

// POST /api/groups/[id]/members — leader adds a member by phone search
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify caller is leader
  const { data: myMembership } = await (supabase.from as any)('farmer_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('farmer_id', myProfile.id)
    .single();

  if (!myMembership || !['leader', 'secretary'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Only group leaders can add members' }, { status: 403 });
  }

  const { phone, role = 'member' } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+256/, '0').replace(/^256/, '0');

  // Find the profile by phone (try both formats)
  const { data: found } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, phone_number, location')
    .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+256${normalizedPhone.slice(1)}`)
    .limit(1)
    .single();

  if (!found) return NextResponse.json({ error: 'No farmer found with that phone number. They must be registered on AgriNova first.' }, { status: 404 });
  if (found.id === myProfile.id) return NextResponse.json({ error: 'You are already a member of this group.' }, { status: 400 });

  const { data: group } = await (supabase.from as any)('farmer_groups').select('name, district').eq('id', groupId).single();

  // Same-district check — collecting produce for one shipment only works
  // if everyone contributing is actually local to the group.
  if (group?.district && (found as any).location && group.district !== (found as any).location) {
    return NextResponse.json({
      error: `${found.full_name} is registered in ${(found as any).location}, not ${group.district}. Group members must be in the same district.`,
    }, { status: 400 });
  }

  // A farmer can belong to more than one group, as long as each is in
  // their own district (checked above). The DB's UNIQUE(group_id, farmer_id)
  // still prevents adding the same person to this exact group twice.
  const { error } = await (supabase.from as any)('farmer_group_members').insert({
    group_id:  groupId,
    farmer_id: found.id,
    role,
  });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `${found.full_name} is already in this group.` }, { status: 409 });
    console.error('[/api/groups/[id]/members]', error);
    return NextResponse.json({ error: 'Failed to add group member. Please try again.' }, { status: 500 });
  }

  // Notify the added member
  try {
    await notifyUser(supabase, {
      userId: (found as any).user_id,
      role: 'farmer',
      type: 'group',
      title: `You've been added to ${group?.name ?? 'a farmer group'}`,
      body: `You're now a member of ${group?.name ?? 'a farmer group'} in ${group?.district ?? 'your district'}. You can submit produce for group sales, or leave anytime from Farmer Groups.`,
      url: '/farmer/groups',
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, member: { id: found.id, full_name: found.full_name, role } });
}

// PATCH /api/groups/[id]/members — leader changes a member's role
export async function PATCH(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: myMembership } = await (supabase.from as any)('farmer_group_members')
    .select('role').eq('group_id', groupId).eq('farmer_id', myProfile.id).single();

  if (myMembership?.role !== 'leader') {
    return NextResponse.json({ error: 'Only the group leader can change roles' }, { status: 403 });
  }

  const { memberId, role } = await req.json();
  if (!memberId || !role) return NextResponse.json({ error: 'memberId and role required' }, { status: 400 });
  if (!['secretary', 'treasurer', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { error } = await (supabase.from as any)('farmer_group_members')
    .update({ role })
    .eq('id', memberId)
    .eq('group_id', groupId);

  if (error) {
    console.error('[/api/groups/[id]/members]', error);
    return NextResponse.json({ error: 'Failed to update member role. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/groups/[id]/members — leader removes a member
export async function DELETE(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: myMembership } = await (supabase.from as any)('farmer_group_members')
    .select('role').eq('group_id', groupId).eq('farmer_id', myProfile.id).single();

  if (myMembership?.role !== 'leader') {
    return NextResponse.json({ error: 'Only the group leader can remove members' }, { status: 403 });
  }

  const { memberId } = await req.json();
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farmer_group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId)
    .neq('role', 'leader'); // can't remove self as leader

  if (error) {
    console.error('[/api/groups/[id]/members]', error);
    return NextResponse.json({ error: 'Failed to remove group member. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
