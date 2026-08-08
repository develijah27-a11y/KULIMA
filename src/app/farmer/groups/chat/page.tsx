import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { GroupChatClient } from '@/app/groups/chat/GroupChatClient';
import { MessageCircle } from 'lucide-react';

// Member-facing entry point into a group's chat (group_messages), keyed by
// the room's admin_id. GroupChatClient itself was previously only ever
// rendered for the admin's own dashboard view (adminId === currentUserId) —
// this page renders it for a regular member instead, resolving which
// admin_id room(s) they belong to via group_members.farmer_id.
export default async function FarmerGroupChatPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: myProfile } = await supabase.from('profiles').select('id, full_name').eq('user_id', user.id).single();
  if (!myProfile) redirect('/auth/signin');

  const { data: memberships } = await (supabase.from as any)('group_members')
    .select('admin_id')
    .eq('farmer_id', (myProfile as any).id)
    .eq('status', 'active');

  const adminIds: string[] = Array.from(new Set((memberships ?? []).map((m: any) => m.admin_id)));

  if (adminIds.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center" style={{ padding: '60px 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={28} style={{ color: 'var(--color-primary)' }} />
        </div>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 6 }}>No group chat yet</p>
        <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 320, margin: '0 auto' }}>
          You'll see your group's chat here once a group leader adds you as a member by your phone number.
        </p>
        <Link href="/farmer/groups" style={{ display: 'inline-block', marginTop: 18, padding: '10px 20px', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Browse Farmer Groups
        </Link>
      </div>
    );
  }

  const { data: admins } = await supabase.from('profiles').select('user_id, full_name').in('user_id', adminIds);
  const rooms = adminIds.map(id => ({
    adminId: id,
    adminName: (admins ?? []).find((a: any) => a.user_id === id)?.full_name ?? 'Group Leader',
  }));

  const { room: roomParam } = await searchParams;
  const activeRoom = rooms.find(r => r.adminId === roomParam) ?? rooms[0];

  const { count: memberCount } = await (supabase.from as any)('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', activeRoom.adminId)
    .eq('status', 'active');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-black" style={{ color: 'var(--d-text)', letterSpacing: '-0.03em' }}>
          {rooms.length > 1 ? activeRoom.adminName + "'s Group" : 'Group Chat'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--d-muted)' }}>
          Real-time messaging · {memberCount ?? 0} members
        </p>
        {rooms.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {rooms.map(r => (
              <Link
                key={r.adminId}
                href={`/farmer/groups/chat?room=${r.adminId}`}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  background: r.adminId === activeRoom.adminId ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: r.adminId === activeRoom.adminId ? '#fff' : 'var(--d-muted)',
                }}
              >
                {r.adminName}
              </Link>
            ))}
          </div>
        )}
      </div>
      <GroupChatClient
        adminId={activeRoom.adminId}
        currentUserId={user.id}
        currentUserName={(myProfile as any).full_name ?? 'Member'}
        memberCount={memberCount ?? 0}
      />
    </div>
  );
}
