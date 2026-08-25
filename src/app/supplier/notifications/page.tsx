import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InteractiveNotificationsView } from '@/components/notifications/InteractiveNotificationsView';

export default async function SupplierNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .or('role.eq.supplier,role.is.null')
    .order('created_at', { ascending: false })
    .limit(60);

  const notifications = (data ?? []) as any[];

  return (
    <InteractiveNotificationsView
      initialNotifications={notifications}
      role="supplier"
      userId={user.id}
      title="Supplier Notifications"
      emptySubtitle="Input orders, stock alerts, and settlement payouts will appear here."
    />
  );
}
