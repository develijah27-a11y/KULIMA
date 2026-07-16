import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { type VerificationLevel } from '@/lib/trust';
import { getCropPhotoUrl, getCropGradient } from '@/lib/crop-photos';
import { Leaf } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)', greenMed: 'var(--color-primary-hover)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','sweet_potatoes','sunflower'];
const CROP_COLOR: Record<string, string> = {
  maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED', rice: 'var(--color-sky)',
  banana: 'var(--color-harvest)', cassava: 'var(--color-success)', tomato: 'var(--color-danger)', sorghum: 'var(--color-harvest)',
  groundnuts: 'var(--color-harvest)', sweet_potatoes: 'var(--color-harvest)', sunflower: 'var(--color-harvest)',
};

export default async function BuyerListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; crop?: string; district?: string; sort?: string; farmer?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const sp       = await searchParams;
  const q        = sp.q ?? '';
  const crop     = sp.crop ?? '';
  const district = sp.district ?? '';
  const sort     = sp.sort ?? 'newest';
  const farmer   = sp.farmer ?? '';

  // Fetch listings with farmer profile
  let query = (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at, available_from, farmer_id, image_url, farmer:profiles(id, full_name, location, verification_level, trust_score)')
    .eq('status', 'active');

  if (crop)     query = query.eq('crop_type', crop);
  if (district) query = query.eq('district', district);
  if (q)        query = query.ilike('crop_type', `%${q}%`);
  if (farmer)   query = query.eq('farmer_id', farmer);

  if (sort === 'price_asc')  query = query.order('asking_price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('asking_price', { ascending: false });
  else                            query = query.order('created_at', { ascending: false });

  query = query.limit(60);

  // Market prices for comparison
  const [listingsRes, pricesRes] = await Promise.all([
    query,
    supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(50),
  ]);

  // Verified farmers get more exposure: sort by verification tier first
  // (gold > blue > green > grey/unverified), keeping the buyer's chosen sort
  // (newest/price) as the tiebreaker within each tier. Array.sort is stable,
  // so re-sorting the already-ordered rows by tier alone preserves that.
  const TIER_WEIGHT: Record<string, number> = { gold: 3, blue: 2, green: 1, grey: 0 };
  const listings = [...(listingsRes.data ?? [])].sort((a: any, b: any) =>
    (TIER_WEIGHT[b.farmer?.verification_level ?? 'grey'] ?? 0) - (TIER_WEIGHT[a.farmer?.verification_level ?? 'grey'] ?? 0)
  );
  const prices   = pricesRes.data ?? [];

  const priceMap: Record<string, number> = {};
  prices.forEach((p: any) => {
    if (!priceMap[p.crop_type]) priceMap[p.crop_type] = p.price_per_kg;
  });

  // Build filter URL helper
  function filterUrl(changes: Record<string, string>) {
    const params = new URLSearchParams({ q, crop, district, sort, ...changes });
    ['q','crop','district','sort'].forEach(k => { if (!params.get(k)) params.delete(k); });
    return `/buyer/listings?${params}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          {farmer ? 'Farmer Listings' : 'Browse Listings'}
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {listings.length} listing{listings.length !== 1 ? 's' : ''} available
          {farmer && <a href="/buyer/listings" style={{ marginLeft: 10, color: C.green, fontWeight: 600, textDecoration: 'none' }}>← All listings</a>}
        </p>
      </div>

      {/* Search + filters */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
        <form method="get" action="/buyer/listings" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search crop..."
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
            <select name="crop" defaultValue={crop} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: crop ? C.text : C.muted }}>
              <option value="">All crops</option>
              {CROPS.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.replace(/_/g,' ')}</option>)}
            </select>
            <select name="district" defaultValue={district} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: district ? C.text : C.muted }}>
              <option value="">All districts</option>
              {['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.text }}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </form>

        {/* Active filter chips */}
        {(crop || district || q) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
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
            {q && (
              <a href={filterUrl({ q: '' })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed, textDecoration: 'none', fontWeight: 600 }}>
                "{q}" ×
              </a>
            )}
          </div>
        )}
      </div>

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Leaf size={48} style={{ color: C.muted }} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No listings found</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l: any) => {
            const k        = l.crop_type?.toLowerCase() ?? '';
            const color    = CROP_COLOR[k] ?? C.greenMed;
            const market   = priceMap[k];
            const farmer   = l.farmer ?? {};
            const priceDelta = market ? Math.round(((l.asking_price - market) / market) * 100) : null;

            const photoUrl  = l.image_url || getCropPhotoUrl(k, 400, 220);
            const gradient  = getCropGradient(k);

            return (
              <Link
                key={l.id}
                href={`/buyer/listings/${l.id}`}
                style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, textDecoration: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {/* Crop photo header */}
                <div style={{
                  height: 140, position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                  backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {/* Overlay gradient for text legibility */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                  {!photoUrl && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Leaf size={52} style={{ color: 'rgba(255,255,255,0.8)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
                    </div>
                  )}
                  {/* Quantity badge */}
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {l.quantity_kg.toLocaleString()} kg
                  </span>
                  {/* Crop name on photo */}
                  <div style={{ position: 'absolute', bottom: 10, left: 14 }}>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: 0, textTransform: 'capitalize', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{l.crop_type}</p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '1px 0 0' }}>{l.district}</p>
                  </div>
                </div>

                <div style={{ padding: '14px 16px', flex: 1 }}>

                  {/* Farmer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {farmer.full_name?.[0]?.toUpperCase() ?? 'F'}
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {farmer.full_name ?? 'Farmer'}
                    </p>
                    {farmer.verification_level && <VerificationBadge level={farmer.verification_level as VerificationLevel} size="xs" showLabel={false} />}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
                        UGX {Math.round(l.asking_price).toLocaleString()}
                      </p>
                      <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>per kg</p>
                    </div>
                    {priceDelta !== null && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: Math.abs(priceDelta) <= 10 ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)', color: Math.abs(priceDelta) <= 10 ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                        {priceDelta >= 0 ? '+' : ''}{priceDelta}% vs market
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
                  <p style={{ fontSize: 12, color: C.greenMed, fontWeight: 700, margin: 0, textAlign: 'center' }}>
                    View & Buy →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
