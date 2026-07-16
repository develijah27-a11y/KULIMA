import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { Bookmark } from 'lucide-react';

export default async function FarmerFavouriteSuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: favs } = await (supabase.from as any)('farmer_favourites')
    .select('id, supplier_id, created_at, supplier:profiles!farmer_favourites_supplier_id_fkey(id, full_name, location, verification_level, trust_score)')
    .eq('farmer_id', user.id)
    .order('created_at', { ascending: false });

  const list = (favs ?? []) as any[];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.03em' }}>
          Saved Suppliers
        </h1>
        <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '4px 0 0' }}>
          {list.length} saved {list.length === 1 ? 'supplier' : 'suppliers'}
        </p>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Bookmark size={48} /></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 6 }}>No saved suppliers yet</p>
          <p style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 20 }}>
            Browse inputs and tap Add to Favourites to reorder from an agro-dealer again later.
          </p>
          <Link
            href="/farmer/suppliers"
            style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: 12,
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Browse Suppliers
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {list.map((fav) => {
            const supplier = fav.supplier as any;
            const initial = supplier?.full_name?.[0]?.toUpperCase() ?? 'S';
            return (
              <div
                key={fav.id}
                style={{
                  background: 'var(--d-card)', borderRadius: 18,
                  boxShadow: 'var(--d-shadow-card)', padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800,
                }}>
                  {initial}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-text)', margin: 0 }}>
                    {supplier?.full_name ?? 'Supplier'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '2px 0 0' }}>
                    {supplier?.location ?? 'Uganda'}
                    {supplier?.trust_score ? ` · ⭐ ${Number(supplier.trust_score).toFixed(1)}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/farmer/suppliers?supplier=${encodeURIComponent(fav.supplier_id)}`}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10,
                      background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    View products
                  </Link>
                  <FavouriteButton kind="supplier" targetId={fav.supplier_id} initialFavourited={true} size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
