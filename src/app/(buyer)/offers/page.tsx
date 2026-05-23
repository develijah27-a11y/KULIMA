import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/shared\PageHeader';

export default async function BuyerOffersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const sp = await searchParams;
  const tab = sp.tab ?? 'pending';

  const { data: offers } = await (supabase.from as any)('offers').select('*, listing:listings(*), farmer:profiles(name,phone)').eq('buyer_id', user.id).eq('status', tab).order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-soil">
      <header className="border-b border-surface2 bg-surface sticky top-0 z-30 px-6 py-3">
        <div className="max-w-3xl mx-auto flex gap-2" role="tablist">
          {['pending','accepted','rejected'].map(t => (
            <a key={t} href={`?tab=${t}`} role="tab" aria-selected={tab === t}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${tab === t ? 'bg-sprout text-soil' : 'text-cream/50'}`}>
              {t}
            </a>
          ))}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-6 space-y-3">
        {(offers ?? []).length === 0 ? (
          <p className="text-cream/30 text-center py-12">No {tab} offers</p>
        ) : (
          (offers ?? []).map((o: any) => (
            <div key={o.id} className="rounded-2xl bg-surface border border-surface2 p-4">
              <div className="flex justify-between">
                <p className="text-sm font-semibold text-cream capitalize">{o.listing?.crop_type}</p>
                <Badge variant={o.status === 'accepted' ? 'green' : o.status === 'rejected' ? 'red' : 'gold'}>{o.status}</Badge>
              </div>
              <p className="text-[11px] text-cream/35 mt-1">{o.farmer?.name} · {o.listing?.quantity_kg} kg</p>
              <div className="mt-3 flex items-center gap-4">
                <div><p className="text-[10px] text-cream/35 uppercase">Offered</p><PriceTag value={o.offered_price} size="md" /></div>
                <div><p className="text-[10px] text-cream/35 uppercase">Asked</p><p className="text-sm font-mono text-cream/60">UGX {Math.round(o.listing?.asking_price ?? 0).toLocaleString()}</p></div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
