import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InteractiveNotificationsView } from '@/components/notifications/InteractiveNotificationsView';

export default async function OfftakerNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .or('role.eq.offtaker,role.is.null')
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as any[];

  return (
    <InteractiveNotificationsView
      initialNotifications={notifications}
      role="offtaker"
      userId={user.id}
      title="Offtaker Notifications"
      emptySubtitle="Contract status, supply pipeline alerts, and invoice updates will appear here."
    />
  );
}
