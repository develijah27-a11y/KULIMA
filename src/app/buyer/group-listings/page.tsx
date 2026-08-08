import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf, Users } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};


const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga'];

export default async function GroupListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ crop?: string; district?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const sp       = await searchParams;
  const crop     = sp.crop ?? '';
  const district = sp.district ?? '';

  let query = (supabase.from as any)('group_listings')
    .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, image_url, status, created_at, group_name')
    .eq('status', 'active')
    .order('crop_type', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(120);

  if (crop)     query = query.eq('crop_type', crop);
  if (district) query = query.eq('district', district);

  // Also get market prices for comparison
  const [listingsRes, pricesRes] = await Promise.all([
    query,
    supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(50),
  ]);

  const listings = listingsRes.data ?? [];
  const prices   = pricesRes.data ?? [];
  const priceMap: Record<string, number> = {};
  prices.forEach((p: any) => { if (!priceMap[p.crop_type]) priceMap[p.crop_type] = p.price_per_kg; });

  // Group by crop so buyers can shop "all maize", "all beans", etc. as
  // distinct sections instead of one interleaved feed.
  const byCrop = new Map<string, any[]>();
  for (const l of listings) {
    const key = l.crop_type ?? 'other';
    if (!byCrop.has(key)) byCrop.set(key, []);
    byCrop.get(key)!.push(l);
  }
  const cropSections = [...byCrop.entries()].sort(([a], [b]) => a.localeCompare(b));

  function filterUrl(changes: Record<string, string>) {
    const params = new URLSearchParams({ crop, district, ...changes });
    ['crop','district'].forEach(k => { if (!params.get(k)) params.delete(k); });
    return `/buyer/group-listings?${params}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Group Listings
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {listings.length} consolidated lot{listings.length !== 1 ? 's' : ''} from farmer groups · bulk quantities at competitive prices
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Leaf size={18} style={{ color: C.greenMed, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.greenMed, margin: '0 0 2px' }}>What are Group Listings?</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Farmer cooperatives pool their harvests into large consolidated lots. Buy directly from groups for larger quantities and better prices.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
        <form method="get" action="/buyer/group-listings" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select name="crop" defaultValue={crop} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: crop ? C.text : C.muted }}>
            <option value="">All crops</option>
            {CROPS.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.replace(/_/g,' ')}</option>)}
          </select>
          <select name="district" defaultValue={district} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: district ? C.text : C.muted }}>
            <option value="">All districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button type="submit" style={{ padding: '8px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Filter
          </button>
          {(crop || district) && (
            <a href="/buyer/group-listings" style={{ padding: '8px 14px', fontSize: 13, color: C.muted, textDecoration: 'none', borderRadius: 10, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center' }}>
              Clear ×
            </a>
          )}
        </form>
      </div>

      {/* Active filter chips */}
      {(crop || district) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {crop && (
            <a href={filterUrl({ crop: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
              {crop.replace(/_/g,' ')} ×
            </a>
          )}
          {district && (
            <a href={filterUrl({ district: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
              {district} ×
            </a>
          )}
        </div>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Users size={48} style={{ color: C.muted }} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No group listings available</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Check back soon — farmer groups publish consolidated lots regularly.</p>
          <Link href="/buyer/listings" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Browse Individual Listings →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
        {cropSections.map(([cropType, cropListings]) => (
          <div key={cropType}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Leaf size={16} style={{ color: getCropColor(cropType) }} />
              <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'capitalize', margin: 0 }}>
                {cropType.replace(/_/g, ' ')}
              </h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 999 }}>
                {cropListings.length} lot{cropListings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
          {cropListings.map((l: any) => {
            const market     = priceMap[l.crop_type?.toLowerCase()];
            const priceDelta = market ? Math.round(((l.asking_price - market) / market) * 100) : null;
            const totalValue = Math.round((l.total_quantity_kg ?? 0) * (l.asking_price ?? 0));

            return (
              <Link
                key={l.id}
                href={`/buyer/group-listings/${l.id}`}
                style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, textDecoration: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {/* Card header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      background: l.image_url ? `center/cover url(${l.image_url})` : 'var(--color-primary-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!l.image_url && <Leaf size={22} style={{ color: getCropColor(l.crop_type) }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, textTransform: 'capitalize' }}>{l.crop_type}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed }}>GROUP LOT</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                        {l.group_name ? <><strong style={{ color: C.text, fontWeight: 700 }}>{l.group_name}</strong> · </> : ''}
                        {l.district} · {l.member_count} farmer{l.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Quantity bar */}
                  <div style={{ padding: '10px 12px', background: 'var(--d-page)', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>Total Available</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>{(l.total_quantity_kg ?? 0).toLocaleString()} kg</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>Lot Value</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: C.greenMed, margin: 0 }}>UGX {totalValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Price section */}
                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.greenMed, margin: 0, letterSpacing: '-0.02em' }}>
                      UGX {Math.round(l.asking_price ?? 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>per kg</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {priceDelta !== null && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: Math.abs(priceDelta) <= 10 ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)', color: Math.abs(priceDelta) <= 10 ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                        {priceDelta >= 0 ? '+' : ''}{priceDelta}% vs market
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
                  <p style={{ fontSize: 12, color: C.greenMed, fontWeight: 700, margin: 0, textAlign: 'center' }}>Place Bulk Order →</p>
                </div>
              </Link>
            );
          })}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
