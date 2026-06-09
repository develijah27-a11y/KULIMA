import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InventoryClient, type InventoryItem } from './InventoryClient';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, primary_crop')
    .eq('user_id', session.user.id)
    .single();

  const items: InventoryItem[] = await (supabase.from as any)('farm_inventory')
    .select('*')
    .eq('farmer_id', profile?.id)
    .order('category')
    .order('name')
    .then((res: any) => res.data ?? [])
    .catch(() => []);

  return (
    <InventoryClient
      initialItems={items}
      profile={profile as any}
    />
  );
}
