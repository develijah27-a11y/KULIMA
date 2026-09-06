import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
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

  // group_members is a separate roster (a "groups"-role leader adding
  // members by phone) from farmer_group_members below — a farmer can be in
  // one without the other, so this link only shows when it's actually usable.
  const { count: chatRoomCount } = await (supabase.from as any)('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('farmer_id', (profile as any).id)
    .eq('status', 'active');

  const [membershipsRes, allGroupsRes] = await Promise.all([
    // Groups this farmer belongs to
    (supabase.from as any)('farmer_group_members')
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
  const memberCounts: Record<string, number> = {};
  if (allGroupIds.length > 0) {
    const { data: counts } = await (supabase.from as any)('farmer_group_members')
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
    <div className="max-w-2xl mx-auto">
      {(chatRoomCount ?? 0) > 0 && (
        <Link
          href="/farmer/groups/chat"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            padding: '12px 16px', borderRadius: 12, marginBottom: 16,
            background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
          }}
        >
          <MessageCircle size={18} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Open your group chat</span>
          <span style={{ marginLeft: 'auto', fontSize: 13 }}>→</span>
        </Link>
      )}
      <GroupsClient
        myGroups={myGroups}
        allGroups={allWithCounts}
        profileId={profile.id}
      />
    </div>
  );
}
