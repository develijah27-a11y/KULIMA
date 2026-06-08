import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DISTRICT_NAMES } from '@/lib/districts';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
  green: '#1B4332', greenMed: '#40916C', greenBright: '#52B788',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};

const CROP_COLOR: Record<string, string> = {
  maize: '#D97706', beans: '#DC2626', coffee: '#7C3AED', rice: '#0284C7',
  banana: '#B45309', cassava: '#059669', tomato: '#DC2626',
  sorghum: '#D97706', groundnuts: '#B45309', sweet_potatoes: '#D97706', sunflower: '#B45309',
};

function demandLabel(bidsPerListing: number): { label: string; color: string; bg: string } {
  if (bidsPerListing >= 3)  return { label: 'High Demand', color: '#DC2626', bg: '#FEF2F2' };
  if (bidsPerListing >= 1.5) return { label: 'Rising',     color: '#D97706', bg: '#FFFBEB' };
  if (bidsPerListing >= 0.5) return { label: 'Moderate',   color: '#0284C7', bg: '#DBEAFE' };
  return                            { label: 'Low',         color: '#6B7280', bg: '#F3F4F6' };
}

export default async function FarmerPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; crop?: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const sp       = await searchParams;
  const district = sp.district ?? '';
  const cropFilter = sp.crop ?? '';

  const [profileRes, pricesRes, demandRes, historyRes] = await Promise.all([
    supabase.from('profiles').select('primary_crop, location').eq('user_id', session.user.id).single(),
    // Current prices
    (supabase.from as any)('market_prices')
      .select('crop_type, price_per_kg, market_name, district, recorded_at')
      .gte('recorded_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(300),
    // Demand signals
    (supabase.from as any)('crop_demand_signals').select('*'),
    // Price history (30 days for trend)
    (supabase.from as any)('market_prices')
      .select('crop_type, price_per_kg, district, recorded_at')
      .gte('recorded_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('recorded_at', { ascending: true })
      .limit(500),
  ]);

  const primaryCrop = profileRes.data?.primary_crop ?? 'maize';
  const allPrices   = pricesRes.data ?? [];
  const demand      = demandRes.data ?? [];
  const history     = historyRes.data ?? [];

  // Build demand map
  const demandMap: Record<string, { offer_count: number; bids_per_listing: number }> = {};
  demand.forEach((d: any) => {
    demandMap[d.crop_type] = {
      offer_count: Number(d.offer_count_30d) ?? 0,
      bids_per_listing: parseFloat(d.bids_per_listing) || 0,
    };
  });

  // Filter prices by selected district
  const filteredPrices = district
    ? allPrices.filter((p: any) => p.district === district)
    : allPrices;

  // Group by crop: one entry per crop (latest price for selected district or national)
  const cropMap: Record<string, { price: number; market: string; district: string }> = {};
  for (const p of filteredPrices) {
    const crop = p.crop_type?.toLowerCase();
    if (!crop) continue;
    if (cropFilter && crop !== cropFilter) continue;
    if (!cropMap[crop]) {
      cropMap[crop] = { price: p.price_per_kg, market: p.market_name, district: p.district ?? 'National' };
    }
  }

  // National averages
  const nationalAvg: Record<string, number[]> = {};
  for (const p of allPrices) {
    const k = p.crop_type?.toLowerCase();
    if (k) { if (!nationalAvg[k]) nationalAvg[k] = []; nationalAvg[k].push(p.price_per_kg); }
  }
  const avgMap: Record<string, number> = {};
  for (const [c, vals] of Object.entries(nationalAvg)) {
    avgMap[c] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  // Price trend per crop (latest vs 30 days ago)
  const trendMap: Record<string, number> = {};
  const historyGroups: Record<string, number[]> = {};
  for (const h of history) {
    const k = h.crop_type?.toLowerCase();
    if (k) { if (!historyGroups[k]) historyGroups[k] = []; historyGroups[k].push(h.price_per_kg); }
  }
  for (const [crop, vals] of Object.entries(historyGroups)) {
    if (vals.length >= 2) {
      trendMap[crop] = Math.round(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100);
    }
  }

  // District price comparison for selected crop
  const districtCompare: Array<{ district: string; price: number }> = [];
  if (cropFilter) {
    const distMap: Record<string, number> = {};
    for (const p of allPrices) {
      if (p.crop_type?.toLowerCase() === cropFilter && p.district && !distMap[p.district]) {
        distMap[p.district] = p.price_per_kg;
      }
    }
    for (const [d, price] of Object.entries(distMap)) {
      districtCompare.push({ district: d, price });
    }
    districtCompare.sort((a, b) => b.price - a.price);
  }

  // High-demand crops sorted by demand
  const cropEntries = Object.entries(cropMap).sort(([a], [b]) => {
    const da = demandMap[a]?.offer_count ?? 0;
    const db = demandMap[b]?.offer_count ?? 0;
    if (a === primaryCrop) return -1;
    if (b === primaryCrop) return 1;
    return db - da;
  });

  // Top 3 high-demand crops
  const hotCrops = [...demand]
    .sort((a: any, b: any) => (b.offer_count_30d ?? 0) - (a.offer_count_30d ?? 0))
    .slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Market Prices
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            Live prices across Uganda districts
          </p>
        </div>
        <Link href="/farmer/planting" style={{ padding: '8px 14px', background: '#F0FDF4', color: C.greenMed, borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          🌱 Planting Plan →
        </Link>
      </div>

      {/* Hot crops demand alert */}
      {hotCrops.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '16px 20px' }}>
          <p style={{ color: '#52B788', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            🔥 High Buyer Demand (Last 30 Days)
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hotCrops.map((d: any) => (
              <a
                key={d.crop_type}
                href={`/farmer/prices?crop=${d.crop_type}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.12)', borderRadius: 8, textDecoration: 'none' }}
              >
                <span style={{ fontSize: 18 }}>{CROP_EMOJI[d.crop_type] ?? '🌾'}</span>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 12, margin: 0, textTransform: 'capitalize' }}>{d.crop_type}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>{d.offer_count_30d} offers · UGX {Math.round(d.avg_asked || d.avg_offered_price || 0).toLocaleString()}/kg avg bid</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
        <form method="get" action="/farmer/prices" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>District</label>
            <select name="district" defaultValue={district}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', background: '#fff', color: district ? C.text : C.muted }}>
              <option value="">All Uganda</option>
              {DISTRICT_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crop</label>
            <select name="crop" defaultValue={cropFilter}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', background: '#fff', color: cropFilter ? C.text : C.muted }}>
              <option value="">All Crops</option>
              {Object.keys(CROP_EMOJI).map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', height: 38 }}>
            Filter
          </button>
          {(district || cropFilter) && (
            <a href="/farmer/prices" style={{ padding: '8px 14px', background: '#F3F4F6', color: C.muted, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', height: 38, display: 'flex', alignItems: 'center' }}>
              Clear
            </a>
          )}
        </form>
      </div>

      {/* District comparison for selected crop */}
      {cropFilter && districtCompare.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>
            {CROP_EMOJI[cropFilter] ?? '🌾'} {cropFilter.replace(/_/g,' ')} prices across districts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {districtCompare.map((d, i) => {
              const maxPrice = districtCompare[0].price;
              const pct = Math.round((d.price / maxPrice) * 100);
              const isBest = i === 0;
              return (
                <div key={d.district} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, width: 100, flexShrink: 0 }}>{d.district}</p>
                  <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isBest ? C.greenMed : '#B7D9C5', borderRadius: 999 }} />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: isBest ? C.greenMed : C.text, width: 80, textAlign: 'right', flexShrink: 0 }}>
                    UGX {Math.round(d.price).toLocaleString()}
                  </p>
                  {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D1FAE5', color: '#059669', flexShrink: 0 }}>BEST</span>}
                </div>
              );
            })}
          </div>
          {districtCompare.length > 1 && (
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
              💡 Sell in {districtCompare[0].district} for UGX {Math.round(districtCompare[0].price - districtCompare[districtCompare.length - 1].price).toLocaleString()}/kg more than the lowest market.
            </p>
          )}
        </div>
      )}

      {/* Main price list */}
      {cropEntries.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>📊</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No prices found for this filter</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Try selecting a different district or clear the filter</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>
              {district ? `${district} Prices` : 'All Uganda Prices'}
            </p>
            <p style={{ fontSize: 11, color: C.muted }}>{cropEntries.length} crops · Updated today</p>
          </div>

          <div className="divide-y" style={{ borderColor: C.border }}>
            {cropEntries.map(([crop, info]) => {
              const color   = CROP_COLOR[crop] ?? C.greenMed;
              const emoji   = CROP_EMOJI[crop] ?? '🌾';
              const nat     = avgMap[crop];
              const trend   = trendMap[crop];
              const dm      = demandMap[crop];
              const isPrimary = crop === primaryCrop;
              const vsNational = nat ? Math.round(((info.price - nat) / nat) * 100) : null;
              const demandBadge = dm ? demandLabel(dm.bids_per_listing) : null;

              return (
                <a
                  key={crop}
                  href={`/farmer/prices?${district ? `district=${district}&` : ''}crop=${crop}`}
                  style={{ display: 'block', padding: '14px 20px', textDecoration: 'none', background: isPrimary ? '#F0FDF4' : 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {emoji}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                          {crop.replace(/_/g, ' ')}
                        </p>
                        {isPrimary && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D1FAE5', color: '#059669' }}>YOUR CROP</span>
                        )}
                        {demandBadge && dm && dm.offer_count > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: demandBadge.bg, color: demandBadge.color }}>
                            {demandBadge.label}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                        {info.market} · {info.district}
                        {dm && dm.offer_count > 0 && ` · ${dm.offer_count} buyers active`}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                        UGX {Math.round(info.price).toLocaleString()}
                      </p>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {trend !== null && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: trend >= 0 ? '#059669' : '#DC2626' }}>
                            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}% (30d)
                          </span>
                        )}
                        {vsNational !== null && !district && (
                          <span style={{ fontSize: 10, color: C.muted }}>avg: {Math.round(nat!).toLocaleString()}</span>
                        )}
                        {vsNational !== null && district && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: vsNational >= 0 ? '#059669' : '#DC2626' }}>
                            {vsNational >= 0 ? '+' : ''}{vsNational}% vs national
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Negotiation tip */}
      <div style={{ background: '#F0FDF4', borderRadius: 14, padding: '14px 18px', border: '1px solid #A7F3D0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.greenMed, margin: '0 0 4px' }}>💡 Selling Tip</p>
        <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5, margin: 0 }}>
          Buyers typically offer 10–20% below asking price. Set your listing price 15% above your minimum acceptable price to leave room to negotiate. Use the "Make Offer" feature to counter back.
        </p>
      </div>

      {/* Admin link */}
      <div style={{ textAlign: 'center' }}>
        <Link href="/admin/prices" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>
          Admin: Update market prices →
        </Link>
      </div>
    </div>
  );
}
