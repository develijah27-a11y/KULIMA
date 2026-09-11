import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupChatClient } from './GroupChatClient';

export default async function GroupChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [profileRes, memberCountRes, messagesRes, membersRes] = await Promise.all([
    supabase.from('profiles').select('full_name, location').eq('user_id', user.id).single(),
    (supabase.from as any)('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', user.id)
      .eq('status', 'active'),
    (supabase.from as any)('group_messages')
      .select('id, admin_id, sender_id, sender_name, body, created_at')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100),
    (supabase.from as any)('group_members')
      .select('id, name, phone_number, role, status')
      .eq('admin_id', user.id)
      .eq('status', 'active')
      .limit(25),
  ]);

  const fullName   = profileRes.data?.full_name ?? 'Group Lead';
  const memberCount = memberCountRes.count ?? 0;
  const initialMessages = messagesRes.data ?? [];
  const membersData = membersRes.data ?? [];

  return (
    <div className="wa-chat-page-root">
      <GroupChatClient
        adminId={user.id}
        currentUserId={user.id}
        currentUserName={fullName}
        memberCount={memberCount}
        initialMessages={initialMessages}
        groupName={`${fullName}'s Farmer Collective`}
        membersList={(membersData ?? []).map((m: any) => ({
          id: m.id,
          name: m.name || 'Member',
          phone_number: m.phone_number,
          role: m.role || 'member',
          status: m.status,
        }))}
      />
    </div>
  );
}
