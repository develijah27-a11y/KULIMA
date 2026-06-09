import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupsClient } from './GroupsClient';

export default async function FarmerGroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const [membershipsRes, allGroupsRes] = await Promise.all([
    // Groups this farmer belongs to
    (supabase.from as any)('group_members')
      .select('role, group:farmer_groups(id, name, description, district, leader_id, is_active)')
      .eq('farmer_id', profile.id),
    // All active groups
    (supabase.from as any)('farmer_groups')
      .select('id, name, description, district, leader_id, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const memberships = membershipsRes.data ?? [];
  const allGroups   = allGroupsRes.data ?? [];

  // Attach member counts
  const allGroupIds = allGroups.map((g: any) => g.id);
  let memberCounts: Record<string, number> = {};
  if (allGroupIds.length > 0) {
    const { data: counts } = await (supabase.from as any)('group_members')
      .select('group_id')
      .in('group_id', allGroupIds);
    (counts ?? []).forEach((r: any) => {
      memberCounts[r.group_id] = (memberCounts[r.group_id] ?? 0) + 1;
    });
  }

  const myGroups = memberships
    .filter((m: any) => m.group?.is_active)
    .map((m: any) => ({
      ...m.group,
      my_role: m.role,
      member_count: memberCounts[m.group?.id] ?? 0,
    }));

  const allWithCounts = allGroups.map((g: any) => ({
    ...g,
    member_count: memberCounts[g.id] ?? 0,
  }));

  return (
    <GroupsClient
      myGroups={myGroups}
      allGroups={allWithCounts}
      profileId={profile.id}
    />
  );
}
