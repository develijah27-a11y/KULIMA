import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const baseProfile = await getOrCreateProfile(supabase, user);
  if (!baseProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 500 });

  // getOrCreateProfile only returns { id } — fetch the fields this route
  // actually needs (district match, existing phone, name for the leader's
  // notification) in one follow-up query.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, location, phone_number')
    .eq('id', baseProfile.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 500 });

  const { groupId, phone_number } = await req.json();
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

  const { data: group } = await (supabase.from as any)('farmer_groups')
    .select('id, name, district, leader_id')
    .eq('id', groupId)
    .single();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  // Same-district check — collecting produce for one shipment only works
  // if everyone contributing is actually local to the group.
  if (group.district && (profile as any).location && group.district !== (profile as any).location) {
    return NextResponse.json({
      error: `${group.name} is based in ${group.district}, but your profile is in ${(profile as any).location}. Groups only accept members from their own district.`,
    }, { status: 400 });
  }

  // One-group-per-farmer check
  const { data: existingMembership } = await (supabase.from as any)('farmer_group_members')
    .select('group_id, farmer_groups(name)')
    .eq('farmer_id', (profile as any).id)
    .maybeSingle();
  if (existingMembership) {
    const existingGroupName = (existingMembership as any).farmer_groups?.name ?? 'another group';
    return NextResponse.json({
      error: `You're already a member of ${existingGroupName} and can only belong to one group at a time.`,
    }, { status: 409 });
  }

  // A phone number is required so group sale payouts can reach this
  // member's mobile money — capture it now if the profile doesn't have one.
  if (!(profile as any).phone_number) {
    if (!phone_number?.trim()) {
      return NextResponse.json({ error: 'PHONE_REQUIRED' }, { status: 400 });
    }
    await supabase.from('profiles').update({ phone_number: phone_number.trim() }).eq('id', (profile as any).id);
  }

  const { error } = await (supabase.from as any)('farmer_group_members').insert({
    group_id:  groupId,
    farmer_id: (profile as any).id,
    role:      'member',
  });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    console.error('[/api/groups/join]', error);
    return NextResponse.json({ error: 'Failed to join group. Please try again.' }, { status: 500 });
  }

  // Notify the group leader that someone joined
  try {
    const { data: leaderProfile } = await supabase.from('profiles').select('user_id').eq('id', group.leader_id).single();
    if (leaderProfile) {
      await (supabase.from as any)('notifications').insert({
        user_id: (leaderProfile as any).user_id,
        type: 'group',
        title: 'New member joined your group',
        body: `${(profile as any).full_name ?? 'A farmer'} joined ${group.name}.`,
        read: false,
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}
