import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  const role = (profile as any)?.role ?? 'farmer';

  if (role === 'admin')       redirect('/admin/dashboard');
  if (role === 'buyer')       redirect('/buyer/dashboard');
  if (role === 'transporter') redirect('/transporter/dashboard');
  if (role === 'supplier')    redirect('/supplier/dashboard');
  if (role === 'pathologist') redirect('/pathologist/dashboard');
  if (role === 'offtaker')    redirect('/offtaker/dashboard');
  if (role === 'groups')      redirect('/groups/dashboard');
  redirect('/farmer/dashboard');
}
