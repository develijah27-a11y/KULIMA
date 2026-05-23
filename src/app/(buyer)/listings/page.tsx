import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';

export default async function BuyerPricesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: listings } = await (supabase.from as any)('listings').select('*, farmer:profiles(name,location,rating)').eq('status','active').order('created_at', { ascending: false }).limit(40);

  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <h1 className="text-xl font-bold text-cream" style={{ fontFamily: 'var(--font-headline)' }}>Browse Listings</h1>
        <p className="text-sm text-cream/40">{listings?.length ?? 0} listings available</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(listings ?? []).map((l: any) => (
            <div key={l.id} className="rounded-2xl bg-surface border border-surface2 p-4">
              <p className="text-sm font-semibold text-cream capitalize">{l.crop_type}</p>
              <p className="text-[11px] text-cream/35">{l.farmer?.name} · {l.farmer?.location}</p>
              <div className="flex items-end justify-between mt-3">
                <PriceTag value={l.asking_price} size="md" />
                <Badge variant="green">Active</Badge>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
