import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchWeatherForFarmer, type ServerWeatherData } from '@/lib/weather-server';
import { buildSeasonalPlan, generateDiseaseAlerts, type InsightSeverity } from '@/lib/agri-intel';
import { generatePlantingAlerts } from '@/lib/planting-calendar';

// Deduplicate weather fetch across WeatherCard + WeatherForecast components in same render
const getWeatherCached = cache(async (lat: number, lon: number): Promise<ServerWeatherData> => {
  return fetchWeatherForFarmer(lat, lon);
});

// ─── Shared cached fetchers ───────────────────────────────────────────────────

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('full_name, primary_crop, phone_number, location, latitude, longitude, id')
    .eq('user_id', userId)
    .single();
  return data as any;
});

const getListingsCount = cache(async (profileId: string) => {
  const supabase = await createClient();
  const { count } = await (supabase.from as any)('listings')
    .select('id', { count: 'exact', head: true })
    .eq('farmer_id', profileId);
  return count ?? 0;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAgriScore(profile: any, listingsCount: number): number {
  let s = 300;
  if (profile?.full_name)   s += 50;
  if (profile?.phone_number) s += 30;
  if (profile?.location)    s += 30;
  if (profile?.primary_crop) s += 40;
  if (profile?.latitude && profile?.longitude) s += 150;
  s += Math.min(listingsCount * 50, 200);
  return Math.min(s, 850);
}

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

// Design constants
const C = {
  green:      'var(--color-primary)',
  greenMed:   'var(--color-primary-hover)',
  greenBright:'var(--color-primary-muted)',
  amber:      'var(--color-harvest)',
  red:        'var(--color-danger)',
  blue:       'var(--color-sky)',
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  pageBg:     'var(--d-page)',
  cardShadow: 'var(--d-shadow-card)',
};

const SEVERITY_MAP: Record<InsightSeverity, { color: string; bg: string; border: string }> = {
  critical: { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  border: 'var(--color-danger-border)'  },
  warning:  { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)' },
  positive: { color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
  info:     { color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)',     border: 'var(--color-sky-muted)'      },
};

const CROP_COLORS: Record<string, string> = {
  maize: '#D97706', beans: '#16A34A', coffee: '#92400E',
  rice: '#0EA5E9', banana: '#D97706', cassava: '#16A34A', tomato: '#DC2626',
};

const Card = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, ...style }} className={className}>
    {children}
  </div>
);

// ─── Streaming: Weather card (3-column) ──────────────────────────────────────

async function WeatherCard({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const lat: number = profile?.latitude ?? 0.3476;
  const lon: number = profile?.longitude ?? 32.5825;
  const weather = await getWeatherCached(lat, lon);
  const ICON: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '03d': '☁️', '04d': '☁️',
    '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
  };

  const dailyMap: Record<string, { high: number; low: number; icon: string }> = {};
  for (const item of weather.forecast) {
    const k = new Date(item.dt_txt).toLocaleDateString('en-UG', { weekday: 'short' });
    if (!dailyMap[k]) dailyMap[k] = { high: item.main.temp_max, low: item.main.temp_min, icon: item.weather[0].icon };
    else { dailyMap[k].high = Math.max(dailyMap[k].high, item.main.temp_max); dailyMap[k].low = Math.min(dailyMap[k].low, item.main.temp_min); }
  }
  const days = Object.entries(dailyMap).slice(0, 4);

  const todayDate = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Card>
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: C.border }}>
        {/* Temperature */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.muted }}>Current Weather</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black" style={{ color: C.text, letterSpacing: '-0.04em' }}>{weather.now.temp}°C</span>
            <span className="text-3xl mb-1">{ICON[weather.now.icon] ?? '🌤️'}</span>
          </div>
          <p className="text-sm capitalize mt-1" style={{ color: C.muted }}>{weather.now.description}</p>
          <div className="flex gap-4 mt-3">
            <span className="text-xs" style={{ color: C.muted }}>💧 {weather.now.humidity}%</span>
            <span className="text-xs" style={{ color: C.muted }}>💨 {weather.now.wind.toFixed(1)} m/s</span>
          </div>
        </div>

        {/* Rain forecast */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.muted }}>Rain Forecast</p>
          {(() => {
            const rainItem = weather.forecast.find((f) => (f.rain?.['3h'] ?? 0) > 0);
            if (rainItem) {
              const dt = new Date(rainItem.dt_txt);
              return (
                <>
                  <p className="text-2xl mb-1">🌧️</p>
                  <p className="text-sm font-bold" style={{ color: C.red }}>
                    Rain at {dt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs mt-1" style={{ color: C.muted }}>
                    {rainItem.rain?.['3h'].toFixed(1)}mm expected
                  </p>
                </>
              );
            }
            return (
              <>
                <p className="text-2xl mb-1">☀️</p>
                <p className="text-sm font-bold" style={{ color: C.greenMed }}>No rain expected</p>
                <p className="text-xs mt-1" style={{ color: C.muted }}>Good for fieldwork</p>
              </>
            );
          })()}
        </div>

        {/* Date */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.muted }}>Today</p>
          <p className="text-2xl mb-1">📅</p>
          <p className="text-sm font-bold leading-snug" style={{ color: C.text }}>{todayDate}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {days.slice(0, 2).map(([label, d]) => (
              <div key={label} className="text-center">
                <p className="text-[10px]" style={{ color: C.muted }}>{label}</p>
                <p className="text-sm">{ICON[d.icon] ?? '🌤️'}</p>
                <p className="text-[10px] font-bold">{Math.round(d.high)}°</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Streaming: Quick stats (4 cards) ────────────────────────────────────────

async function QuickStats({ userId }: { userId: string }) {
  const supabase = await createClient();
  const profile = await getProfile(userId);
  const primaryCrop = profile?.primary_crop ?? 'maize';

  const [listingsRes, priceRes, alertCount] = await Promise.all([
    (supabase.from as any)('listings')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', profile?.id)
      .eq('status', 'active'),
    supabase.from('market_prices').select('price_per_kg')
      .ilike('crop_type', `%${primaryCrop}%`)
      .order('recorded_at', { ascending: false }).limit(2),
    (supabase.from as any)('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', userId).eq('read', false),
  ]);

  const priceData = priceRes.data ?? [];
  const latestPrice = priceData[0]?.price_per_kg;
  const prevPrice = priceData[1]?.price_per_kg;
  const priceTrend = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice * 100) : null;

  const stats = [
    {
      label: 'Active Listings',
      value: `${listingsRes.count ?? 0}`,
      sub: 'Available to buyers',
      icon: '📦',
      color: C.greenBright,
      border: C.greenBright,
    },
    {
      label: `${primaryCrop.charAt(0).toUpperCase() + primaryCrop.slice(1)} Price`,
      value: latestPrice ? `UGX ${Math.round(latestPrice).toLocaleString()}` : '—',
      sub: priceTrend !== null ? `${priceTrend >= 0 ? '↑' : '↓'} ${Math.abs(priceTrend).toFixed(1)}% today` : 'per kg',
      icon: '💰',
      color: priceTrend !== null && priceTrend < 0 ? C.red : C.amber,
      border: priceTrend !== null && priceTrend < 0 ? C.red : C.amber,
    },
    {
      label: 'Farm Value',
      value: '—',
      sub: 'Add inventory to calculate',
      icon: '🏡',
      color: C.blue,
      border: C.blue,
    },
    {
      label: 'Alerts',
      value: `${alertCount.count ?? 0}`,
      sub: alertCount.count ? 'Unread notifications' : 'All clear',
      icon: alertCount.count ? '🔔' : '✅',
      color: alertCount.count ? C.red : C.greenBright,
      border: alertCount.count ? C.red : C.greenBright,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon, color, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── AI Recommendation banner ─────────────────────────────────────────────────

async function AIBanner({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const month = new Date().getMonth();
  const season = buildSeasonalPlan(month, profile?.primary_crop ?? 'maize');
  const crop = profile?.primary_crop ?? 'crops';

  return (
    <div
      className="rounded-xl p-5 flex items-start gap-4"
      style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(82,183,136,0.2)' }}>
        🌱
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary-muted)' }}>AI Recommendation</p>
        <p className="text-sm font-bold text-white leading-snug">{season.currentTask}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {season.season} · {season.daysLeft} days remaining · {crop.charAt(0).toUpperCase() + crop.slice(1)} season
        </p>
      </div>
      <a
        href="/farmer/weather"
        className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
        style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}
      >
        Details →
      </a>
    </div>
  );
}

// ─── Streaming: Market prices table ──────────────────────────────────────────

async function MarketPricesTable({ userId }: { userId: string }) {
  const supabase = await createClient();
  const profile = await getProfile(userId);
  const { data: prices } = await supabase
    .from('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .gte('recorded_at', new Date(Date.now() - 2 * 864e5).toISOString())
    .order('recorded_at', { ascending: false })
    .limit(40);

  const rows = prices ?? [];
  const groups: Record<string, number[]> = {};
  rows.forEach((p: any) => {
    const k = p.crop_type?.toLowerCase() ?? '';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p.price_per_kg);
  });

  // Put farmer's primary crop first
  const primary = profile?.primary_crop?.toLowerCase() ?? '';
  const sorted = Object.entries(groups)
    .map(([crop, ps]) => ({
      crop,
      latest: ps[0],
      trend: ps[1] ? ((ps[0] - ps[1]) / ps[1] * 100) : null,
    }))
    .sort((a, b) => (a.crop === primary ? -1 : b.crop === primary ? 1 : 0))
    .slice(0, 8);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Market Prices Today
        </p>
        <a href="/farmer/prices" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</a>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No price data yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {sorted.map(({ crop, latest, trend }) => {
            const up = (trend ?? 0) >= 0;
            const color = CROP_COLORS[crop] ?? C.greenMed;
            const isPrimary = crop === primary;
            return (
              <div key={crop} className="px-5 py-3 flex items-center justify-between" style={{ background: isPrimary ? '#F0FDF4' : 'transparent' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <p className="text-sm font-medium capitalize" style={{ color: C.text }}>{crop}</p>
                  {isPrimary && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>
                      Your crop
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold" style={{ color: C.text }}>
                    UGX {Math.round(latest).toLocaleString()}
                  </p>
                  {trend !== null && (
                    <span className="text-xs font-bold" style={{ color: up ? '#059669' : C.red }}>
                      {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Streaming: 4-day weather forecast ───────────────────────────────────────

async function WeatherForecast({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const lat = profile?.latitude ?? 0.3476;
  const lon = profile?.longitude ?? 32.5825;
  const weather = await getWeatherCached(lat, lon);

  const ICON: Record<string, string> = {
    '01d': '☀️', '02d': '⛅', '03d': '☁️', '04d': '☁️',
    '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️',
  };

  const dailyMap: Record<string, { high: number; low: number; icon: string; rain: boolean }> = {};
  for (const item of weather.forecast) {
    const k = new Date(item.dt_txt).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric' });
    if (!dailyMap[k]) dailyMap[k] = { high: item.main.temp_max, low: item.main.temp_min, icon: item.weather[0].icon, rain: (item.rain?.['3h'] ?? 0) > 0 };
    else {
      dailyMap[k].high = Math.max(dailyMap[k].high, item.main.temp_max);
      dailyMap[k].low = Math.min(dailyMap[k].low, item.main.temp_min);
      if ((item.rain?.['3h'] ?? 0) > 0) dailyMap[k].rain = true;
    }
  }

  const days = Object.entries(dailyMap).slice(0, 4);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Weather Forecast
        </p>
        <a href="/farmer/weather" className="text-xs font-semibold" style={{ color: C.greenMed }}>Details →</a>
      </div>
      <div className="grid grid-cols-4 divide-x p-2" style={{ borderColor: C.border }}>
        {days.map(([label, d], i) => (
          <div key={label} className="flex flex-col items-center gap-1.5 py-4 px-2" style={{ background: d.rain && i === 1 ? '#FEF3C7' : 'transparent', borderRadius: '8px' }}>
            <p className="text-[11px] font-bold" style={{ color: C.muted }}>{label.split(' ')[0]}</p>
            <p className="text-2xl">{ICON[d.icon] ?? '🌤️'}</p>
            <p className="text-sm font-black" style={{ color: C.text }}>{Math.round(d.high)}°</p>
            <p className="text-[11px]" style={{ color: C.muted }}>{Math.round(d.low)}°</p>
            {d.rain && <span className="text-[10px] font-bold" style={{ color: C.red }}>Rain</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Streaming: Recent offers ─────────────────────────────────────────────────

async function RecentOffers({ userId }: { userId: string }) {
  const supabase = await createClient();
  const profile = await getProfile(userId);
  if (!profile?.id) return null;

  const { data: offers } = await (supabase.from as any)('offers')
    .select('id, offered_price, status, created_at, listing:listings(crop_type, quantity_kg)')
    .eq('listing.farmer_id', profile.id)
    .in('status', ['pending', 'accepted', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = (offers ?? []).filter((o: any) => o?.listing);

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'New',      color: '#059669', bg: '#D1FAE5' },
    accepted: { label: 'Accepted', color: 'var(--color-info)', bg: 'var(--color-sky-bg)' },
    rejected: { label: 'Rejected', color: 'var(--color-danger)', bg: '#FEE2E2' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Offers</p>
        <a href="/farmer/marketplace" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</a>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No offers yet</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Create a listing to attract buyers</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((o: any) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            return (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: '#F0FDF4', color: C.greenMed }}>
                    🛒
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>
                      {o.listing.crop_type} · {o.listing.quantity_kg} kg
                    </p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{timeAgo(o.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-black" style={{ color: C.text }}>
                    UGX {Math.round(o.offered_price).toLocaleString()}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Streaming: AgriScore + Finance overview ──────────────────────────────────

async function FinanceOverview({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const listingsCount = profile?.id ? await getListingsCount(profile.id) : 0;
  const score = computeAgriScore(profile, listingsCount);
  const pct = Math.round(((score - 300) / (850 - 300)) * 100);

  let scoreColor = C.red;
  let scoreLabel = 'Building';
  let loanLimit = '500,000';
  let eligibility = 'Low';
  if (score >= 500) { scoreColor = C.amber; scoreLabel = 'Fair'; loanLimit = '1,500,000'; eligibility = 'Moderate'; }
  if (score >= 650) { scoreColor = C.greenMed; scoreLabel = 'Good'; loanLimit = '3,000,000'; eligibility = 'Good'; }
  if (score >= 780) { scoreColor = C.greenBright; scoreLabel = 'Excellent'; loanLimit = '5,000,000'; eligibility = 'Excellent'; }

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Finance Overview
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: C.border }}>
        {/* AgriScore */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>AgriScore</p>
          <p className="text-3xl font-black mb-1" style={{ color: scoreColor, letterSpacing: '-0.04em' }}>{score}</p>
          <p className="text-xs font-semibold mb-3" style={{ color: scoreColor }}>{scoreLabel}</p>
          <div className="h-1.5 rounded-full mb-1" style={{ background: '#F3F4F6' }}>
            <div className="h-1.5 rounded-full agriscore-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.amber}, ${scoreColor})` }} />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ color: C.muted }}>300</span>
            <span className="text-[10px]" style={{ color: C.muted }}>850</span>
          </div>
        </div>

        {/* Loan eligibility */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Loan Eligibility</p>
          <p className="text-base font-bold mb-1" style={{ color: scoreColor }}>{eligibility}</p>
          <p className="text-xs mb-3" style={{ color: C.muted }}>You can apply for a loan</p>
          <div className="h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: scoreColor, borderRadius: '9999px' }} />
          </div>
        </div>

        {/* Recommended limit */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Recommended Limit</p>
          <p className="text-xl font-black mb-1" style={{ color: C.text, letterSpacing: '-0.03em' }}>
            UGX {loanLimit}
          </p>
          <p className="text-xs" style={{ color: C.muted }}>Based on your farm score</p>
          <a
            href="/farmer/finance"
            className="mt-3 block text-xs font-bold px-3 py-1.5 rounded-lg text-center"
            style={{ background: '#F0FDF4', color: C.greenMed }}
          >
            Apply for loan →
          </a>
        </div>
      </div>
    </Card>
  );
}

// ─── Disease alerts ───────────────────────────────────────────────────────────

async function DiseasePanel({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const month = new Date().getMonth();
  const alerts = generateDiseaseAlerts(month, profile?.primary_crop ?? '');
  if (alerts.length === 0) return null;

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Disease & Risk Alerts
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {alerts.map((a) => {
          const cfg = SEVERITY_MAP[a.severity];
          return (
            <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: cfg.bg }}>
                {a.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{a.title}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: cfg.bg, color: cfg.color }}>{a.severity}</span>
                </div>
                <p className="text-xs leading-snug" style={{ color: C.muted }}>{a.body}</p>
                {a.action && <p className="text-xs mt-1 font-semibold" style={{ color: cfg.color }}>→ {a.action}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Planting Alerts widget ───────────────────────────────────────────────────

async function PlantingAlertsWidget({ userId }: { userId: string }) {
  const supabase = await createClient();
  const profile = await getProfile(userId);
  const farmsRes = await (supabase.from as any)('farms')
    .select('crop_types').eq('user_id', userId).eq('is_active', true);

  const farmCrops: string[] = (farmsRes.data ?? []).flatMap((f: any) => f.crop_types ?? []);
  if (profile?.primary_crop) farmCrops.push(profile.primary_crop);
  const farmerCrops = [...new Set(farmCrops)];

  const now = new Date();
  const alerts = generatePlantingAlerts(now.getMonth(), now.getDate(), farmerCrops);
  if (alerts.length === 0) return null;

  const URGENCY: Record<string, { bg: string; color: string; border: string }> = {
    high:   { bg: '#FEF2F2', color: 'var(--color-danger)', border: '#FECACA' },
    medium: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    low:    { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Planting Alerts
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} for your crops
          </p>
        </div>
        <a href="/farmer/planting" className="text-xs font-semibold" style={{ color: C.greenMed }}>View calendar →</a>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {alerts.slice(0, 3).map((alert, i) => {
          const cfg = URGENCY[alert.urgency];
          return (
            <div key={i} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                {alert.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{alert.title}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {alert.urgency.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs leading-snug" style={{ color: C.muted }}>{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Create Listing', href: '/farmer/marketplace/create', emoji: '✏️', bg: '#F0FDF4', color: 'var(--color-primary)' },
    { label: 'Add Record',     href: '/farmer/farm',               emoji: '📋', bg: '#EFF6FF', color: 'var(--color-info)' },
    { label: 'Check Weather',  href: '/farmer/weather',            emoji: '🌤',  bg: '#FFFBEB', color: '#D97706' },
    { label: 'Scan Disease',   href: '/farmer/doctor',             emoji: '🔍', bg: '#F5F3FF', color: '#7C3AED' },
    { label: 'Apply for Loan', href: '/farmer/finance',            emoji: '💰', bg: '#FEF2F2', color: '#DC2626' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, emoji, bg, color }) => (
          <a
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 py-4 rounded-xl transition-opacity hover:opacity-85"
            style={{ background: bg, textDecoration: 'none' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
              {emoji}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </a>
        ))}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FarmerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* 1 · Weather card */}
      <Suspense fallback={<div className="dash-skeleton h-36 rounded-xl" />}>
        <WeatherCard userId={userId} />
      </Suspense>

      {/* 2 · Quick stats */}
      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
        </div>
      }>
        <QuickStats userId={userId} />
      </Suspense>

      {/* 3 · AI recommendation */}
      <Suspense fallback={<div className="dash-skeleton h-20 rounded-xl" />}>
        <AIBanner userId={userId} />
      </Suspense>

      {/* 4 · Market prices + Weather forecast (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <MarketPricesTable userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <WeatherForecast userId={userId} />
        </Suspense>
      </div>

      {/* 5 · Recent offers + Disease alerts (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-64 rounded-xl" />}>
          <RecentOffers userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-64 rounded-xl" />}>
          <DiseasePanel userId={userId} />
        </Suspense>
      </div>

      {/* 5b · Planting alerts */}
      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
        <PlantingAlertsWidget userId={userId} />
      </Suspense>

      {/* 6 · Finance overview */}
      <Suspense fallback={<div className="dash-skeleton h-40 rounded-xl" />}>
        <FinanceOverview userId={userId} />
      </Suspense>

      {/* 7 · Quick actions */}
      <QuickActions />

    </div>
  );
}
