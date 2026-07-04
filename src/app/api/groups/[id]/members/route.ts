import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    .select('id, full_name, phone_number')
    .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+256${normalizedPhone.slice(1)}`)
    .limit(1)
    .single();

  if (!found) return NextResponse.json({ error: 'No farmer found with that phone number. They must be registered on AgriNova first.' }, { status: 404 });
  if (found.id === myProfile.id) return NextResponse.json({ error: 'You are already a member of this group.' }, { status: 400 });

  const { error } = await (supabase.from as any)('farmer_group_members').insert({
    group_id:  groupId,
    farmer_id: found.id,
    role,
  });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `${found.full_name} is already in this group.` }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
