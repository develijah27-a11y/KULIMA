import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountPage } from '@/components/account/AccountPage';

export default async function TransporterAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <AccountPage role="transporter" roleLabel="Delivery Agent" />;
}
