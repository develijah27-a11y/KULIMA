import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CatalogueClient } from './CatalogueClient';

export default async function SupplierCataloguePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const { data: products } = await (supabase.from as any)('supplier_products')
    .select('id, name, category, description, price_per_unit, unit, stock_qty, min_order_qty, district, is_available, created_at')
    .eq('supplier_id', profile.id)
    .order('created_at', { ascending: false });

  return <CatalogueClient products={products ?? []} />;
}
