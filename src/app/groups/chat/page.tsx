import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupChatClient } from './GroupChatClient';

export default async function GroupChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [profileRes, memberCountRes] = await Promise.all([
    supabase.from('profiles').select('full_name, location').eq('user_id', user.id).single(),
    (supabase.from as any)('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', user.id)
      .eq('status', 'active'),
  ]);

  const fullName   = profileRes.data?.full_name ?? 'Group Lead';
  const memberCount = memberCountRes.count ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-black" style={{ color: 'var(--d-text)', letterSpacing: '-0.03em' }}>
          Group Chat
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--d-muted)' }}>
          Real-time messaging · {memberCount} members
        </p>
      </div>
      <GroupChatClient
        adminId={user.id}
        currentUserId={user.id}
        currentUserName={fullName}
        memberCount={memberCount}
      />
    </div>
  );
}
