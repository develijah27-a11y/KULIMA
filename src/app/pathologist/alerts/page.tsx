import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PathologistAlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  redirect('/pathologist/disease-alerts');
}
