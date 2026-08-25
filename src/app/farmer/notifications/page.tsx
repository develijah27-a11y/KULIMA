import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InteractiveNotificationsView } from '@/components/notifications/InteractiveNotificationsView';

export default async function FarmerNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .or('role.eq.farmer,role.is.null')
    .order('created_at', { ascending: false })
    .limit(60);

  const notifications = (data ?? []) as any[];

  return (
    <InteractiveNotificationsView
      initialNotifications={notifications}
      role="farmer"
      userId={user.id}
      title="Farmer Notifications"
      emptySubtitle="Market orders, crop disease alerts, and weather warnings will appear here."
    />
  );
}
