import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Package, Leaf, FlaskConical, Wrench, Settings } from 'lucide-react';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { type VerificationLevel } from '@/lib/trust';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { BuyProductButton } from '@/app/farmer/suppliers/BuyProductButton';
import type { JSX } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const CATEGORIES = ['seeds', 'fertilizers', 'pesticides', 'tools', 'equipment', 'other'];
const CAT_ICON: Record<string, JSX.Element> = {
  seeds:       <Leaf size={40} />,
  fertilizers: <Leaf size={40} />,
  pesticides:  <FlaskConical size={40} />,
  tools:       <Wrench size={40} />,
  equipment:   <Settings size={40} />,
  other:       <Package size={40} />,
};

// Group leaders can place a normal, instant order with any registered agro
// dealer directly — same browsing/ordering flow as /farmer/suppliers, just
// reachable from the groups dashboard nav. For pooled, large-volume orders
// where the dealer names a bulk discount instead, see Bulk Orders.
export default async function GroupSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; district?: string; supplier?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const sp       = await searchParams;
  const q        = sp.q ?? '';
  const category = sp.category ?? '';
  const district = sp.district ?? '';
  const supplier = sp.supplier ?? '';

  let query = (supabase.from as any)('supplier_products')
    .select('id, name, category, description, price_per_unit, unit, stock_qty, min_order_qty, district, image_url, supplier_id, is_flash_deal, flash_price_ugx, flash_ends_at, supplier:profiles!supplier_products_supplier_id_fkey(id, full_name, business_name, location, verification_level, role_verification_levels)')
    .eq('is_available', true)
    .gt('stock_qty', 0);

  if (category) query = query.eq('category', category);
  if (district) query = query.eq('district', district);
  if (q)        query = query.ilike('name', `%${q}%`);
  if (supplier) query = query.eq('supplier_id', supplier);

  query = query.order('created_at', { ascending: false }).limit(60);

  const [{ data: products }, { data: favRows }, { data: businesses }] = await Promise.all([
    query,
    (supabase.from as any)('farmer_favourites').select('supplier_id').eq('farmer_id', user.id),
    (supabase.from as any)('profiles')
      .select('id, business_name, full_name, location, verification_level, role_verification_levels')
      .or('role.eq.supplier,roles.cs.{supplier}')
      .order('business_name', { ascending: true, nullsFirst: false })
      .limit(40),
  ]);

  const favouritedIds = new Set((favRows ?? []).map((f: any) => f.supplier_id));
  const rows = (products ?? []) as any[];
  const bizRows = (businesses ?? []) as any[];

  function filterUrl(changes: Record<string, string>) {
    const params = new URLSearchParams({ q, category, district, ...changes });
    ['q', 'category', 'district'].forEach(k => { if (!params.get(k)) params.delete(k); });
    return `/groups/suppliers?${params}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          {supplier ? 'Supplier Catalogue' : 'Order From Agro Dealers'}
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {rows.length} product{rows.length !== 1 ? 's' : ''} available
          {supplier && <a href="/groups/suppliers" style={{ marginLeft: 10, color: C.green, fontWeight: 600, textDecoration: 'none' }}>← All suppliers</a>}
          {!supplier && <Link href="/groups/bulk-orders" style={{ marginLeft: 10, color: C.green, fontWeight: 600, textDecoration: 'none' }}>Need a huge quantity? Request a bulk discount →</Link>}
        </p>
      </div>

      {/* Registered businesses — pick who to buy from before browsing products */}
      {!supplier && bizRows.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Registered agro-dealer businesses
          </p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {bizRows.map((b: any) => (
              <Link
                key={b.id}
                href={`/groups/suppliers?supplier=${encodeURIComponent(b.id)}`}
                style={{
                  flexShrink: 0, width: 168, background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow,
                  padding: '12px 14px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {(b.business_name || b.full_name)?.[0]?.toUpperCase() ?? 'S'}
                  </div>
                  {(b.role_verification_levels?.supplier ?? b.verification_level) && (
                    <VerificationBadge level={(b.role_verification_levels?.supplier ?? b.verification_level) as VerificationLevel} size="xs" showLabel={false} />
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {b.business_name || b.full_name || 'Agro-dealer'}
                </p>
                {b.location && (
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{b.location}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
        <form method="get" action="/groups/suppliers" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search products..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none' }}
            />
            <button
              type="submit"
              style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Search
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select name="category" defaultValue={category} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: category ? C.text : C.muted }}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
            <select name="district" defaultValue={district} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: district ? C.text : C.muted }}>
              <option value="">All districts</option>
              {['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {supplier && <input type="hidden" name="supplier" value={supplier} />}
        </form>

        {(category || district || q) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {category && (
              <a href={filterUrl({ category: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
                {category} ×
              </a>
            )}
            {district && (
              <a href={filterUrl({ district: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
                {district} ×
              </a>
            )}
            {q && (
              <a href={filterUrl({ q: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
                "{q}" ×
              </a>
            )}
          </div>
        )}
      </div>

      {/* Products grid */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Package size={48} style={{ color: C.muted }} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No products found</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p: any) => {
            const supp = p.supplier ?? {};
            const flashActive = !!p.is_flash_deal && !!p.flash_ends_at && new Date(p.flash_ends_at) > new Date();
            const effectivePrice = flashActive ? Number(p.flash_price_ugx) : Number(p.price_per_unit);
            return (
              <div key={p.id} style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Photo header */}
                <div style={{
                  height: 130, position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--color-primary-muted) 0%, var(--color-primary) 100%)',
                  backgroundImage: p.image_url ? `url(${p.image_url})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!p.image_url && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.85)' }}>
                      {CAT_ICON[p.category] ?? <Package size={40} />}
                    </div>
                  )}
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {p.stock_qty.toLocaleString()} {p.unit} left
                  </span>
                  {flashActive && (
                    <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--color-harvest)', color: '#fff' }}>
                      ⚡ Flash Deal
                    </span>
                  )}
                </div>

                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>{p.name}</p>

                  {/* Supplier row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Link
                      href={`/groups/suppliers?supplier=${encodeURIComponent(p.supplier_id)}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, textDecoration: 'none' }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {(supp.business_name || supp.full_name)?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {supp.business_name || supp.full_name || 'Supplier'}
                      </p>
                      {(supp.role_verification_levels?.supplier ?? supp.verification_level) && (
                        <VerificationBadge level={(supp.role_verification_levels?.supplier ?? supp.verification_level) as VerificationLevel} size="xs" showLabel={false} />
                      )}
                    </Link>
                    <FavouriteButton kind="supplier" targetId={p.supplier_id} initialFavourited={favouritedIds.has(p.supplier_id)} size={16} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      {flashActive && (
                        <p style={{ fontSize: 12, color: C.muted, margin: 0, textDecoration: 'line-through' }}>
                          UGX {Math.round(p.price_per_unit).toLocaleString()}
                        </p>
                      )}
                      <p style={{ fontSize: 18, fontWeight: 800, color: flashActive ? 'var(--color-harvest)' : C.text, margin: 0, letterSpacing: '-0.02em' }}>
                        UGX {Math.round(effectivePrice).toLocaleString()}
                      </p>
                      <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>per {p.unit}</p>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Min {p.min_order_qty} {p.unit}</p>
                  </div>

                  <BuyProductButton
                    productId={p.id}
                    productName={p.name}
                    unit={p.unit}
                    minOrderQty={p.min_order_qty}
                    stockQty={p.stock_qty}
                    pricePerUnit={effectivePrice}
                  />
                  <Link
                    href={`/groups/bulk-orders/new?productId=${p.id}&name=${encodeURIComponent(p.name)}&unit=${encodeURIComponent(p.unit)}&price=${p.price_per_unit}`}
                    style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, fontWeight: 700, color: C.greenMed, textDecoration: 'none' }}
                  >
                    Need a huge quantity? Request bulk discount →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
