import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupportTickets } from '@/components/support/SupportTickets';

export default async function FarmerSupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <SupportTickets />;
}
