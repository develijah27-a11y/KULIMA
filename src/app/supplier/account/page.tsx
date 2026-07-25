import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountPage } from '@/components/account/AccountPage';

export default async function SupplierAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <AccountPage role="supplier" roleLabel="Input Supplier" />;
}
