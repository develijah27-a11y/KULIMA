import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ROLE_DASHBOARDS: Record<string, string> = {
  admin:       '/admin/dashboard',
  farmer:      '/farmer/dashboard',
  buyer:       '/buyer/dashboard',
  supplier:    '/supplier/dashboard',
  transporter: '/transporter/dashboard',
  pathologist: '/pathologist/dashboard',
  offtaker:    '/offtaker/dashboard',
  groups:      '/groups/dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('user_id', user.id)
    .single();

  const role  = (profile as any)?.role  ?? 'pending';
  const roles = (profile as any)?.roles ?? [];

  // No role set yet → go to onboarding
  if (!role || role === 'pending') redirect('/onboarding/role');

  // Route to the dashboard for the primary role
  if (role === 'farmer') {
    const { count } = await (supabase.from as any)('farms')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (!count || count === 0) {
      redirect('/farmer/farm/new?welcome=1');
    }
  }

  const dest = ROLE_DASHBOARDS[role];
  redirect(dest ?? '/farmer/dashboard');
}
