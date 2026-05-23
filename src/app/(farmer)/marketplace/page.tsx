import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { ListingCard } from '@/components/farm/ListingCard';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  const { data: myListings, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('farmer_id', user.id)
    .order('created_at', { ascending: false });

  const { data: offersRes } = await supabase
    .from('offers')
    .select('listing_id, count')
    .eq('status', 'pending')
    .eq('listing_id', myListings?.map((l) => l.id) ?? [], { count: 'exact' })
    ;

  const offerMap: Record<string, number> = {};
  (offersRes ?? []).forEach((o: any) => { offerMap[o.listing_id] = o.count ?? 0; });

  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-cream" style={{ fontFamily: 'var(--font-headline)' }}>My Listings</h1>
          <span className="text-xs text-cream/40">{myListings?.length ?? 0} active</span>
        </div>

        {/* Price Protection Banner */}
        <div className="p-3 rounded-xl bg-sun/10 border border-sun/20 flex items-center gap-2 text-xs">
          <span className="text-base">🛡️</span>
          <span className="text-sun/80">Kulima alerts you if any offer is more than 15% below market rate.</span>
        </div>

        {myListings && myListings.length > 0 ? (
          <div className="space-y-3">
            {(myListings as any[]).map((l) => (
              <ListingCard
                key={l.id}
                listing={{
                  ...l,
                  offerCount: offerMap[l.id] ?? 0,
                  farmerName: profile?.full_name,
                }}
                isFarmer
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-cream/30">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-sm font-medium">No listings yet</p>
            <p className="text-xs mt-1">Post your first produce above</p>
          </div>
        )}
      </main>
    </div>
  );
}
