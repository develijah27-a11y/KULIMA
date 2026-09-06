import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersClient } from './OrdersClient';

export default async function FarmerOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/auth/signin');

  // Load orders for this farmer (all statuses)
  const { data: orders } = await (supabase.from as any)('orders')
    .select(`
      id, crop_type, quantity_kg, unit_price, total_amount, status,
      buyer_note, farmer_note, pickup_district, dropoff_district,
      confirmed_at, dispatched_at, delivered_at, completed_at, cancelled_at, disputed_at, created_at,
      buyer_id
    `)
    .eq('farmer_profile_id', (profile as any).id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = orders ?? [];

  // Enrich with buyer names
  const buyerIds = [...new Set(rows.map((o: any) => o.buyer_id))] as string[];
  const buyerMap: Record<string, { full_name: string; location: string }> = {};
  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase
      .from('profiles').select('user_id, full_name, location').in('user_id', buyerIds);
    (buyers ?? []).forEach((b: any) => { buyerMap[b.user_id] = { full_name: b.full_name, location: b.location }; });
  }

  const enriched = rows.map((o: any) => ({
    ...o,
    buyer: buyerMap[o.buyer_id] ?? null,
  }));

  return <OrdersClient orders={enriched} />;
}
