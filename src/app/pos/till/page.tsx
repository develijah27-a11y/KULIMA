import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TillClient } from './TillClient';

export default async function TillPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role === 'pos_staff') {
    const { data: staff } = await (supabase.from as any)('pos_staff')
      .select('must_change_password').eq('user_id', user.id).maybeSingle();
    if (staff?.must_change_password) redirect('/pos/change-password');
  }

  return <TillClient />;
}
