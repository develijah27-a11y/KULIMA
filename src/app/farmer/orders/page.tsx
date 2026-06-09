import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersClient } from './OrdersClient';

export default async function FarmerOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const { data: listings } = await (supabase.from as any)('listings')
    .select('id')
    .eq('farmer_id', profile.id);

  const listingIds = (listings ?? []).map((l: any) => l.id);

  let offers: any[] = [];
  if (listingIds.length > 0) {
    const { data } = await (supabase.from as any)('offers')
      .select('id, offered_price, status, message, created_at, listing_id, listing:listings(id, crop_type, quantity_kg, asking_price, district)')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });
    offers = data ?? [];
  }

  return <OrdersClient offers={offers} />;
}
