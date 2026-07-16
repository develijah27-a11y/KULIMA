import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoansClient } from './LoansClient';

export default async function GroupLoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  const { data: group } = myProfile
    ? await (supabase.from as any)('farmer_groups').select('id, name, wallet_balance').eq('leader_id', myProfile.id).maybeSingle()
    : { data: null };

  return <LoansClient groupId={group?.id ?? null} groupWalletBalance={Number(group?.wallet_balance ?? 0)} />;
}
