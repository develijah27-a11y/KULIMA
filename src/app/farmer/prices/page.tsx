import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { DISTRICT_NAMES } from '@/lib/districts';
import { Leaf, Flame, AlertTriangle, BarChart3, Lightbulb } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
};

const REGION_CFG = {
  uganda:      { label: 'Uganda Markets',    desc: 'Farm gate & export prices' },
  east_africa: { label: 'East Africa',       desc: 'Regional exchange prices' },
  global:      { label: 'Global Markets',    desc: 'International futures & OTC' },
} as const;

type Region = keyof typeof REGION_CFG;

const CROP_COLOR: Record<string, string> = {
  coffee_robusta: '#7C3AED', coffee_arabica: '#6D28D9', coffee_kenya: '#5B21B6',
  coffee_ethiopia: '#4C1D95', coffee_tanzania: '#7C3AED',
  coffee_arabica_global: '#6D28D9', coffee_robusta_global: '#7C3AED',
  tea_green_leaf: 'var(--color-success)', tea_made: '#10B981', tea_kenya: '#34D399', tea_global: 'var(--color-success)',
  cotton_seed: 'var(--d-muted)', cotton_lint: 'var(--d-muted)', cotton_global: 'var(--d-muted)',
  vanilla_green: '#8B5CF6', vanilla_cured: '#7C3AED',
  vanilla_madagascar: '#A78BFA', vanilla_global: '#8B5CF6',
  sesame_simsim: 'var(--color-harvest)', sesame_ethiopia: '#B45309', sesame_global: 'var(--color-harvest)',
  sunflower: '#F59E0B', sunflower_oil: '#FBBF24', sunflower_global: '#F59E0B',
  soybean: '#65A30D', soybean_global: '#84CC16',
  tobacco_flue: '#78716C', tobacco_fire: '#92400E',
  cocoa_beans: '#78350F', cocoa_global: '#92400E',
  groundnuts: '#B45309',
  maize_export: 'var(--color-harvest)',
  beans_export: 'var(--color-danger)',
  macadamia: '#0D9488', macadamia_kenya: '#0F766E', macadamia_global: '#0D9488',
  avocado: '#15803D', avocado_kenya: '#16A34A', avocado_global: '#15803D',
  pyrethrum: '#DB2777',
  cashew_tanzania: '#92400E', cashew_global: '#78350F',
  palm_oil_global: 'var(--color-primary-hover)',
  rubber_global: '#16A34A',
};

function trendColor(t: number) {
  if (t > 5)  return 'var(--color-success)';
  if (t > 0)  return 'var(--color-primary)';
  if (t < -5) return 'var(--color-danger)';
  if (t < 0)  return 'var(--color-warning)';
  return C.muted;
}
function trendIcon(t: number) { return t > 0 ? '↑' : t < 0 ? '↓' : '→'; }

function fmt(n: number | null) { return n ? n.toLocaleString('en-UG') : '—'; }
function fmtUsd(n: number | null) { return n ? `$${n.toFixed(2)}` : '—'; }

// ── Cash crop price card
function CashPriceCard({ price }: { price: any }) {
  const color = CROP_COLOR[price.crop_key] ?? C.greenMed;
  const trend = Number(price.trend_pct ?? 0);

  return (
    <div style={{
      background: C.cardBg, borderRadius: 14, boxShadow: C.shadow,
      overflow: 'hidden', borderTop: `3px solid ${color}`,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>{price.crop_emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.2 }}>
              {price.crop_name}
            </p>
            <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {price.market_label}
            </p>
          </div>
          {trend !== 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
              background: trend > 0 ? 'var(--color-success-bg)' : 'var(--color-sky-bg)',
              color: trendColor(trend),
            }}>
              {trendIcon(trend)}{Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            {price.price_ugx && (
              <p style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.03em', margin: 0 }}>
                UGX {fmt(price.price_ugx)}
                <span style={{ fontSize: 11, fontWeight: 500, color: C.muted, marginLeft: 4 }}>/{price.price_per}</span>
              </p>
            )}
            {price.price_usd && (
              <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>
                {fmtUsd(price.price_usd)} USD/{price.price_per}
              </p>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: `${color}15`, color,
          }}>
            {price.price_source}
          </span>
        </div>

        {price.notes && (
          <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, margin: 0, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            {price.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Uganda local market section (existing market_prices table)
async function UgandaLocalPrices({
  district, cropFilter, userId,
}: {
  district: string; cropFilter: string; userId: string;
}) {
  const supabase = await getSupabase();

  const [profileRes, pricesRes, demandRes, cashPricesRes] = await Promise.all([
    supabase.from('profiles').select('primary_crop').eq('user_id', userId).single(),
    (supabase.from as any)('market_prices')
      .select('crop_type, price_per_kg, market_name, district, recorded_at, source')
      .gte('recorded_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('recorded_at', { ascending: false }).limit(300),
    (supabase.from as any)('crop_demand_signals').select('*'),
    (supabase.from as any)('cash_crop_prices')
      .select('*').eq('is_active', true).eq('region', 'uganda')
      .order('crop_key').order('market_level'),
  ]);

  const primaryCrop = profileRes.data?.primary_crop ?? 'maize';
  const allPrices = pricesRes.data ?? [];
  const demand = demandRes.data ?? [];
  const cashPrices: any[] = cashPricesRes.data ?? [];

  const demandMap: Record<string, any> = {};
  demand.forEach((d: any) => { demandMap[d.crop_type] = d; });

  const GLOBAL_SOURCES = new Set(['world-market', 'alphavantage', 'world-bank']);
  const filtered = district ? allPrices.filter((p: any) => p.district === district) : allPrices;
  const cropMap: Record<string, any> = {};
  for (const p of filtered) {
    const k = p.crop_type?.toLowerCase();
    if (!k || (cropFilter && k !== cropFilter)) continue;
    if (!cropMap[k]) cropMap[k] = {
      price: p.price_per_kg,
      market: p.market_name,
      district: p.district ?? 'National',
      source: p.source ?? 'admin',
      recorded_at: p.recorded_at,
    };
  }

  // National average uses only locally-recorded prices (excludes global exchange refs)
  const localPrices = allPrices.filter((p: any) => !GLOBAL_SOURCES.has(p.source));
  const nationalAvg: Record<string, number[]> = {};
  for (const p of localPrices) {
    const k = p.crop_type?.toLowerCase();
    if (k) { if (!nationalAvg[k]) nationalAvg[k] = []; nationalAvg[k].push(p.price_per_kg); }
  }

  // Most recent local-price update for the header
  const lastLocalUpdate = localPrices[0]?.recorded_at
    ? new Date(localPrices[0].recorded_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
    : 'this week';
  const avgMap: Record<string, number> = {};
  for (const [c, vals] of Object.entries(nationalAvg)) {
    avgMap[c] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const hotCrops = [...demand].sort((a: any, b: any) => (b.request_count ?? 0) - (a.request_count ?? 0)).slice(0, 4);
  const cropEntries = Object.entries(cropMap).sort(([a], [b]) => {
    if (a === primaryCrop) return -1;
    if (b === primaryCrop) return 1;
    const da = demandMap[a]?.request_count ?? 0;
    const db = demandMap[b]?.request_count ?? 0;
    return db - da;
  });

  const KNOWN_CROPS = ['maize', 'beans', 'coffee', 'rice', 'banana', 'cassava', 'tomato', 'sorghum', 'groundnuts', 'sweet_potatoes', 'sunflower', 'cotton'];
  const COLOR: Record<string, string> = { maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED', rice: 'var(--color-sky)', banana: '#B45309', cassava: 'var(--color-success)', tomato: 'var(--color-danger)', sorghum: 'var(--color-harvest)', groundnuts: '#B45309', sweet_potatoes: 'var(--color-harvest)', sunflower: '#B45309' };

  // Group cash prices by crop_key
  const cashByCrop: Record<string, any[]> = {};
  for (const p of cashPrices) {
    if (!cashByCrop[p.crop_key]) cashByCrop[p.crop_key] = [];
    cashByCrop[p.crop_key].push(p);
  }

  return (
    <div className="space-y-5">
      {/* Hot demand banner */}
      {hotCrops.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '16px 20px' }}>
          <p style={{ color: '#BBF7D0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={12} /> High Buyer Demand — Last 30 Days
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hotCrops.map((d: any) => (
              <a key={d.crop_type} href={`/farmer/prices?crop=${d.crop_type}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.12)', borderRadius: 8, textDecoration: 'none' }}>
                <span style={{ display: 'flex', color: getCropColor(d.crop_type) }}><Leaf size={16} /></span>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 12, margin: 0, textTransform: 'capitalize' }}>{d.crop_type.replace(/_/g,' ')}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>{d.request_count} active buyers</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px' }}>
        <form method="get" action="/farmer/prices" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input type="hidden" name="tab" value="uganda" />
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>District</label>
            <select name="district" defaultValue={district} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)' }}>
              <option value="">All Uganda</option>
              {DISTRICT_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crop</label>
            <select name="crop" defaultValue={cropFilter} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)' }}>
              <option value="">All Crops</option>
              {KNOWN_CROPS.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Filter</button>
          {(district || cropFilter) && <Link href="/farmer/prices?tab=uganda" style={{ padding: '8px 14px', background: 'var(--color-surface-2)', color: C.muted, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Clear</Link>}
        </form>
      </div>

      {/* Local market prices */}
      {cropEntries.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {district ? `${district} — Local Market` : 'Uganda — All Markets'}
            </p>
            <p style={{ fontSize: 11, color: C.muted }}>Updated {lastLocalUpdate} · UGX/kg</p>
          </div>
          {cropEntries.map(([crop, info]: any, i: number) => {
            const color = COLOR[crop] ?? C.greenMed;
            const dm = demandMap[crop];
            const nat = avgMap[crop];
            const isPrimary = crop === primaryCrop;
            const vsNat = nat && district ? Math.round(((info.price - nat) / nat) * 100) : null;
            return (
              <a key={crop} href={`/farmer/prices?tab=uganda${district ? `&district=${district}` : ''}&crop=${crop}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < cropEntries.length - 1 ? `1px solid ${C.border}` : 'none', textDecoration: 'none', background: isPrimary ? 'var(--color-primary-bg)' : 'transparent' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: getCropColor(crop) }}>
                  <Leaf size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop.replace(/_/g,' ')}</p>
                    {isPrimary && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>YOUR CROP</span>}
                    {dm?.request_count > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>IN DEMAND</span>}
                    {GLOBAL_SOURCES.has(info.source) && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(96,165,250,0.12)', color: 'var(--color-sky)' }}>GLOBAL REF</span>}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{info.market} · {info.district}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color, margin: 0, letterSpacing: '-0.02em' }}>UGX {Math.round(info.price).toLocaleString()}</p>
                  {vsNat !== null && <p style={{ fontSize: 10, fontWeight: 700, color: vsNat >= 0 ? 'var(--color-success)' : 'var(--color-danger)', margin: '2px 0 0' }}>{vsNat >= 0 ? '+' : ''}{vsNat}% vs national avg</p>}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Uganda cash crop export prices */}
      {Object.keys(cashByCrop).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>Uganda Cash Crop Prices</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'var(--color-primary-bg)', color: C.greenMed }}>FARM GATE & EXPORT</span>
          </div>
          {Object.entries(cashByCrop).map(([key, rows]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {rows.map((p: any) => <CashPriceCard key={p.id} price={p} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── East Africa + Global prices
async function RegionalPrices({ region }: { region: 'east_africa' | 'global' }) {
  const supabase = await getSupabase();
  const { data } = await (supabase.from as any)('cash_crop_prices')
    .select('*')
    .eq('is_active', true)
    .eq('region', region)
    .order('crop_key')
    .order('market_level');

  const prices: any[] = data ?? [];

  // Group by crop_key
  const byCrop: Record<string, any[]> = {};
  for (const p of prices) {
    if (!byCrop[p.crop_key]) byCrop[p.crop_key] = [];
    byCrop[p.crop_key].push(p);
  }

  const cfg = REGION_CFG[region];
  const updatedAt = prices[0]?.updated_at ? new Date(prices[0].updated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '20px 24px' }}>
        <p style={{ color: '#BBF7D0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          {cfg.desc}
        </p>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{cfg.label}</p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
          Reference prices · Last updated {updatedAt} · Prices in UGX and USD
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ background: 'var(--color-harvest-bg)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--color-warning-border)' }}>
        <p style={{ fontSize: 12, color: 'var(--color-harvest)', margin: 0, lineHeight: 1.5 }}>
          <AlertTriangle size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /><strong>Reference prices only.</strong> Actual transaction prices depend on grade, quantity, buyer relationship, and current exchange rates.
          {region === 'global' && ' Global prices are futures/OTC benchmark prices converted at 1 USD = UGX 3,800.'}
          {region === 'east_africa' && ' East Africa prices are regional exchange/auction averages.'}
          Always verify with your off-taker or export agent before contracting.
        </p>
      </div>

      {prices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><BarChart3 size={48} /></div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>No prices available yet</p>
          <p style={{ fontSize: 13, color: C.muted }}>Run the migration in Supabase to load price data.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {prices.map((p: any) => <CashPriceCard key={p.id} price={p} />)}
        </div>
      )}

      {/* Source attribution */}
      <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '14px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Price Sources</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[...new Set(prices.map(p => p.price_source))].map(src => (
            <span key={String(src)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--color-surface-2)', color: C.muted }}>
              {String(src)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton fallback
function PriceSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {[1,2,3,4,5,6].map(i => <div key={i} className="dash-skeleton h-36 rounded-2xl" />)}
    </div>
  );
}

// ── Main page
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; district?: string; crop?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  const sp = await searchParams;
  const tab = (sp.tab ?? 'uganda') as Region;
  const district = sp.district ?? '';
  const cropFilter = sp.crop ?? '';

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Cash Crop Prices
          </h1>
          <p style={{ fontSize: 13, color: C.muted }}>
            Uganda farm gate · East Africa · Global markets
          </p>
        </div>
        <Link href="/farmer/planting" style={{ padding: '8px 14px', background: 'var(--color-primary-bg)', color: C.greenMed, borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          Planting Plan →
        </Link>
      </div>

      {/* Region tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface-2)', borderRadius: 12, padding: 4 }}>
        {(Object.entries(REGION_CFG) as [Region, typeof REGION_CFG[Region]][]).map(([key, cfg]) => (
          <a
            key={key}
            href={`/farmer/prices?tab=${key}`}
            style={{
              flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 10,
              background: tab === key ? C.cardBg : 'transparent',
              boxShadow: tab === key ? C.shadow : 'none',
              textDecoration: 'none',
              color: tab === key ? C.green : C.muted,
              fontWeight: tab === key ? 700 : 500,
              fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            {cfg.label}
          </a>
        ))}
      </div>

      {/* Content — streams in */}
      {tab === 'uganda' && (
        <Suspense fallback={<PriceSkeleton />}>
          <UgandaLocalPrices district={district} cropFilter={cropFilter} userId={session.user.id} />
        </Suspense>
      )}
      {tab === 'east_africa' && (
        <Suspense fallback={<PriceSkeleton />}>
          <RegionalPrices region="east_africa" />
        </Suspense>
      )}
      {tab === 'global' && (
        <Suspense fallback={<PriceSkeleton />}>
          <RegionalPrices region="global" />
        </Suspense>
      )}

      {/* Selling tip */}
      <div style={{ background: 'var(--color-primary-bg)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--color-primary-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: C.greenMed, margin: '0 0 4px' }}><Lightbulb size={12} />Know Your Value</div>
        <p style={{ fontSize: 12, color: 'var(--color-success)', lineHeight: 1.5, margin: 0 }}>
          Uganda's export crops earn 2–4× more than local market prices. If you grow coffee, tea, or vanilla — connect with certified exporters and UCDA to access export premiums. Use the Finance Calculator to estimate your actual profit at different price levels.
        </p>
      </div>

    </div>
  );
}
