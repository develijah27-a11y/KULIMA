import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { Heart } from 'lucide-react';

export default async function BuyerFavouritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: favs } = await (supabase.from as any)('buyer_favourites')
    .select('id, farmer_id, created_at, farmer:profiles!buyer_favourites_farmer_id_fkey(id, full_name, location, primary_crop, verification_level, trust_score)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  const list = (favs ?? []) as any[];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.03em' }}>
          Favourite Farmers
        </h1>
        <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '4px 0 0' }}>
          {list.length} saved {list.length === 1 ? 'farmer' : 'farmers'}
        </p>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Heart size={48} /></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 6 }}>No saved farmers yet</p>
          <p style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 20 }}>
            Browse listings and tap the heart icon to save farmers you like.
          </p>
          <Link
            href="/buyer/listings"
            style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: 12,
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {list.map((fav) => {
            const farmer = fav.farmer as any;
            const initial = farmer?.full_name?.[0]?.toUpperCase() ?? 'F';
            return (
              <div
                key={fav.id}
                style={{
                  background: 'var(--d-card)', borderRadius: 18,
                  boxShadow: 'var(--d-shadow-card)', padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800,
                }}>
                  {initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-text)', margin: 0 }}>
                    {farmer?.full_name ?? 'Farmer'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '2px 0 0' }}>
                    {farmer?.location ?? 'Uganda'}
                    {farmer?.primary_crop ? ` · ${farmer.primary_crop}` : ''}
                    {farmer?.trust_score ? ` · ⭐ ${Number(farmer.trust_score).toFixed(1)}` : ''}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/buyer/listings?farmer=${encodeURIComponent(fav.farmer_id)}`}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10,
                      background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    View listings
                  </Link>
                  <FavouriteButton farmerId={fav.farmer_id} initialFavourited={true} size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
