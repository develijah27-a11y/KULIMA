import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InteractiveNotificationsView } from '@/components/notifications/InteractiveNotificationsView';

export default async function PathologistNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('role', 'pathologist')
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as any[];

  return (
    <InteractiveNotificationsView
      initialNotifications={notifications}
      role="pathologist"
      userId={user.id}
      title="Pathologist Notifications"
      emptySubtitle="Urgent crop pathology cases and diagnosis requests will appear here."
    />
  );
}
