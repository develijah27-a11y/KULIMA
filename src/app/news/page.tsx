import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// NewsWidget.tsx (rendered on the farmer/supplier/buyer dashboards) always
// links to this bare /news path rather than threading a role prop through
// three separate dashboard call sites — but only /[role]/news actually
// exists as a page, so this was a real 404 for anyone clicking "View more"
// on the widget. Same role-routing-hub pattern as /dashboard/page.tsx.
const ROLE_NEWS: Record<string, string> = {
  farmer:   '/farmer/news',
  supplier: '/supplier/news',
  buyer:    '/buyer/news',
};

export default async function NewsRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  const role = (profile as any)?.role ?? '';
  redirect(ROLE_NEWS[role] ?? '/farmer/news');
}
