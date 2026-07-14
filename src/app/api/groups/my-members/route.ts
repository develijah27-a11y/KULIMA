import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/groups/my-members — members of the group the current user leads.
// group_listings/group_messages/group_wallet_transactions key by admin_id
// (auth.uid) directly, while membership lives on farmer_groups/
// farmer_group_members keyed by profiles.id — this bridges the two.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: group } = await (supabase.from as any)('farmer_groups')
    .select('id').eq('leader_id', myProfile.id).single();

  if (!group) return NextResponse.json({ members: [] });

  const { data, error } = await (supabase.from as any)('farmer_group_members')
    .select('id, role, farmer:profiles(id, full_name, primary_crop)')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[/api/groups/my-members]', error);
    return NextResponse.json({ error: 'Failed to load group members. Please try again.' }, { status: 500 });
  }

  // Include the leader themselves — they can contribute produce too
  const members = [
    { id: myProfile.id, full_name: 'You (leader)', role: 'leader' },
    ...(data ?? [])
      .filter((m: any) => m.farmer?.id !== myProfile.id)
      .map((m: any) => ({ id: m.farmer?.id, full_name: m.farmer?.full_name ?? 'Member', role: m.role })),
  ];

  return NextResponse.json({ members });
}
