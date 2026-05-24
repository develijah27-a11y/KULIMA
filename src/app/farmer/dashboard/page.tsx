import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchWeatherForFarmer } from '@/lib/weather-server';
import {
  buildSeasonalPlan,
  generateDiseaseAlerts,
  generateMarketInsights,
  generateWeatherInsights,
  type InsightSeverity,
} from '@/lib/agri-intel';

// ─── Shared cached fetchers (deduped per request via React cache) ─────────────

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('full_name, primary_crop, phone_number, location, latitude, longitude, id')
    .eq('user_id', userId)
    .single();
  return data as any;
});

const getUnreadCount = cache(async (userId: string) => {
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('farmer_id', userId)
    .eq('read', false);
  return count ?? 0;
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

const SEVERITY: Record<InsightSeverity, { border: string; bg: string; badge: string; text: string }> = {
  critical: { border: 'rgba(248,113,113,0.35)', bg: 'rgba(248,113,113,0.08)', badge: 'rgba(248,113,113,0.18)', text: '#F87171' },
  warning:  { border: 'rgba(251,191,36,0.3)',   bg: 'rgba(251,191,36,0.07)',  badge: 'rgba(251,191,36,0.18)',  text: '#FBBF24' },
  positive: { border: 'rgba(0,200,117,0.3)',    bg: 'rgba(0,200,117,0.07)',   badge: 'rgba(0,200,117,0.18)',   text: '#00C875' },
  info:     { border: 'rgba(56,189,248,0.25)',  bg: 'rgba(56,189,248,0.06)',  badge: 'rgba(56,189,248,0.18)',  text: '#38BDF8' },
};

const CROP_COLORS: Record<string, string> = {
  maize: '#FBBF24', beans: '#FB923C', coffee: '#A78BFA',
  rice: '#38BDF8', banana: '#FDE68A', cassava: '#10B981',
  sorghum: '#F472B6', groundnuts: '#00C875', cotton: '#38BDF8', tomato: '#F87171',
};

const Sk = ({ h }: { h: string }) => (
  <div className="skeleton rounded-2xl" style={{ height: h }} />
);

// ─── Streaming: Header ────────────────────────────────────────────────────────

async function DashboardHeader({ userId, greeting }: { userId: string; greeting: string }) {
  const [profile, unread] = await Promise.all([
    getProfile(userId),
    getUnreadCount(userId),
  ]);
  const name = profile?.full_name ?? 'Farmer';
  const firstName = name.split(' ')[0];
  const district: string | undefined = profile?.location ?? undefined;

  return (
    <div className="flex items-center justify-between py-5">
      <div>
        <p className="text-xs font-medium" style={{ color: 'rgba(241,245,249,0.4)' }}>{greeting}</p>
        <p className="text-xl font-black mt-0.5" style={{ letterSpacing: '-0.03em' }}>{firstName} 👋</p>
        {district && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(241,245,249,0.35)' }}>📍 {district}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
        >
          {firstName[0]?.toUpperCase() ?? 'F'}
        </div>
        <button
          className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
          style={{ background: 'var(--color-surface2)' }}
          aria-label="Notifications"
        >
          🔔
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black"
              style={{ background: '#F87171', color: '#060B14' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Streaming: AgriScore ─────────────────────────────────────────────────────

async function AgriScoreSection({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const listingsCount = profile?.id ? await getListingsCount(profile.id) : 0;
  const score = computeAgriScore(profile, listingsCount);

  const pct = Math.round(((score - 300) / (850 - 300)) * 100);
  let label = 'Building'; let color = '#F87171';
  if (score >= 500) { label = 'Fair';      color = '#FBBF24'; }
  if (score >= 650) { label = 'Good';      color = '#10B981'; }
  if (score >= 780) { label = 'Excellent'; color = '#00C875'; }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.4)' }}>AgriScore</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black" style={{ color, letterSpacing: '-0.04em' }}>{score}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{label}</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${color}18` }}>🏆</div>
      </div>
      <div className="h-2 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-2 rounded-full agriscore-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #FBBF24, ${color})` }} />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px]" style={{ color: 'rgba(241,245,249,0.25)' }}>300 · Building</span>
        <span className="text-[10px]" style={{ color: 'rgba(241,245,249,0.25)' }}>850 · Excellent</span>
      </div>
      <p className="text-xs mt-3" style={{ color: 'rgba(241,245,249,0.4)' }}>
        Add GPS location, list produce, and complete your profile to raise your score.
      </p>
    </div>
  );
}

// ─── Streaming: Weather intelligence ─────────────────────────────────────────

async function WeatherIntelligence({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const lat: number = profile?.latitude  ?? 0.3476;
  const lon: number = profile?.longitude ?? 32.5825;

  const weather = await fetchWeatherForFarmer(lat, lon);
  const month = new Date().getMonth();

  const insights = generateWeatherInsights(
    {
      temp: weather.now.temp,
      feelsLike: weather.now.temp + 2,
      humidity: weather.now.humidity,
      windSpeed: weather.now.wind,
      description: weather.now.description,
      icon: weather.now.icon,
      rainfall: (weather.forecast[0]?.rain?.['3h'] ?? 0) / 3,
      forecast: [],
    },
    month
  );

  const ICON_MAP: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '04d': '☁️', '09d': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
  };

  const emoji = ICON_MAP[weather.now.icon] ?? '🌤️';

  const dailyMap: Record<string, { high: number; low: number; icon: string }> = {};
  for (const item of weather.forecast) {
    const key = new Date(item.dt_txt).toLocaleDateString('en-UG', { weekday: 'short' });
    if (!dailyMap[key]) {
      dailyMap[key] = { high: item.main.temp_max, low: item.main.temp_min, icon: item.weather[0].icon };
    } else {
      dailyMap[key].high = Math.max(dailyMap[key].high, item.main.temp_max);
      dailyMap[key].low  = Math.min(dailyMap[key].low,  item.main.temp_min);
    }
  }
  const days = Object.entries(dailyMap).slice(0, 5);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.18), rgba(56,189,248,0.08))' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.4)' }}>Weather</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-5xl font-black leading-none" style={{ letterSpacing: '-0.04em' }}>{weather.now.temp}°</span>
              <span className="text-4xl leading-none mb-1">{emoji}</span>
            </div>
            <p className="text-sm capitalize mt-1" style={{ color: 'rgba(241,245,249,0.55)' }}>{weather.now.description}</p>
          </div>
          <div className="text-right space-y-1.5 mt-1">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs" style={{ color: 'rgba(241,245,249,0.4)' }}>💧</span>
              <span className="text-xs font-semibold">{weather.now.humidity}%</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs" style={{ color: 'rgba(241,245,249,0.4)' }}>💨</span>
              <span className="text-xs font-semibold">{weather.now.wind.toFixed(1)} m/s</span>
            </div>
          </div>
        </div>
        {days.length > 0 && (
          <div className="flex gap-2 mt-3">
            {days.map(([label, d]) => (
              <div key={label} className="flex-1 text-center">
                <p className="text-[10px] font-bold" style={{ color: 'rgba(241,245,249,0.4)' }}>{label}</p>
                <p className="text-base my-0.5">{ICON_MAP[d.icon] ?? '🌤️'}</p>
                <p className="text-[10px] font-bold">{Math.round(d.high)}°</p>
                <p className="text-[10px]" style={{ color: 'rgba(241,245,249,0.35)' }}>{Math.round(d.low)}°</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {insights.length > 0 && (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {insights.map((ins) => {
            const cfg = SEVERITY[ins.severity];
            return (
              <div key={ins.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: cfg.bg }}>{ins.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold">{ins.title}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: cfg.badge, color: cfg.text }}>{ins.severity}</span>
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: 'rgba(241,245,249,0.5)' }}>{ins.body}</p>
                  {ins.action && <p className="text-[11px] mt-1 font-semibold" style={{ color: cfg.text }}>→ {ins.action}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Streaming: Market intelligence ──────────────────────────────────────────

async function MarketIntelligence({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const district: string | undefined = profile?.location ?? undefined;
  const supabase = await createClient();
  const twoDays = new Date(Date.now() - 2 * 864e5).toISOString();

  let prices: any[] = [];
  if (district) {
    const { data } = await (supabase.from('market_prices') as any)
      .select('crop_type, price_per_kg, district, recorded_at')
      .gte('recorded_at', twoDays)
      .ilike('district', `%${district}%`)
      .order('recorded_at', { ascending: false })
      .limit(30);
    prices = data ?? [];
  }
  if (prices.length === 0) {
    const { data } = await supabase
      .from('market_prices')
      .select('crop_type, price_per_kg, recorded_at')
      .gte('recorded_at', twoDays)
      .order('recorded_at', { ascending: false })
      .limit(30);
    prices = data ?? [];
  }

  const groups: Record<string, number[]> = {};
  prices.forEach((p: any) => {
    const k = (p.crop_type ?? '').toLowerCase();
    if (!groups[k]) groups[k] = [];
    groups[k].push(p.price_per_kg);
  });

  const rows = Object.entries(groups).map(([crop, ps]) => ({
    crop,
    avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    high: Math.round(Math.max(...ps)),
    low: Math.round(Math.min(...ps)),
    count: ps.length,
  })).sort((a, b) => b.count - a.count).slice(0, 8);

  const insights = generateMarketInsights(prices);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-4xl mb-3">📊</p>
        <p className="font-semibold mb-1">No price data yet</p>
        <p className="text-sm" style={{ color: 'rgba(241,245,249,0.4)' }}>Admin will add market prices soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>Live Prices</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(241,245,249,0.25)' }}>
            {district ? `${district} · national` : 'National market'}
          </p>
        </div>
        <a href="/farmer/prices" className="text-xs font-semibold" style={{ color: 'var(--color-sprout)' }}>All prices →</a>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map(({ crop, avg, high, low }) => {
          const color = CROP_COLORS[crop] ?? '#00C875';
          return (
            <div key={crop} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <p className="text-sm font-semibold capitalize">{crop}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black" style={{ color, letterSpacing: '-0.02em' }}>UGX {avg.toLocaleString()}</p>
                <p className="text-[10px]" style={{ color: 'rgba(241,245,249,0.35)' }}>{low.toLocaleString()} – {high.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
      {insights.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {insights.map((ins) => {
            const cfg = SEVERITY[ins.severity];
            return (
              <div key={ins.id} className="px-5 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: cfg.text }}>{ins.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(241,245,249,0.45)' }}>{ins.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Seasonal strategy (computed, no DB) ─────────────────────────────────────

async function SeasonalStrategy({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const primaryCrop = profile?.primary_crop ?? 'maize';
  const month = new Date().getMonth();
  const plan = buildSeasonalPlan(month, primaryCrop);
  const cfg = SEVERITY[plan.urgency];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: `1px solid ${cfg.border}` }}>
      <div className="px-5 py-4" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.4)' }}>Seasonal Strategy</p>
            <p className="text-base font-black mt-1" style={{ letterSpacing: '-0.02em' }}>{plan.season}</p>
          </div>
          {plan.daysLeft > 0 && (
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: cfg.text, letterSpacing: '-0.04em' }}>{plan.daysLeft}</p>
              <p className="text-[10px]" style={{ color: 'rgba(241,245,249,0.4)' }}>days left</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(241,245,249,0.35)' }}>Recommended crops</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.recommendedCrops.map((crop) => (
              <span key={crop} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cfg.badge, color: cfg.text }}>{crop}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: cfg.text }}>Do now</p>
          <p className="text-sm leading-snug" style={{ color: 'rgba(241,245,249,0.8)' }}>{plan.currentTask}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(241,245,249,0.35)' }}>Coming up</p>
          <p className="text-sm leading-snug" style={{ color: 'rgba(241,245,249,0.55)' }}>{plan.nextTask}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Disease & risk (computed, no DB) ────────────────────────────────────────

async function DiseaseRiskPanel({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const primaryCrop = profile?.primary_crop ?? '';
  const month = new Date().getMonth();
  const alerts = generateDiseaseAlerts(month, primaryCrop);
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>Disease & Risk Alerts</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {alerts.map((a) => {
          const cfg = SEVERITY[a.severity];
          return (
            <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: cfg.bg }}>{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold">{a.title}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: cfg.badge, color: cfg.text }}>{a.severity}</span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: 'rgba(241,245,249,0.5)' }}>{a.body}</p>
                {a.action && <p className="text-[11px] mt-1 font-semibold" style={{ color: cfg.text }}>→ {a.action}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streaming: Buyer offers ──────────────────────────────────────────────────

async function BuyerOffers({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  if (!profile?.id) return null;

  const supabase = await createClient();
  const { data: offers } = await (supabase.from as any)('offers')
    .select('id, offered_price, status, created_at, listing:listings(crop_type, quantity_kg)')
    .eq('listing.farmer_id', profile.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = (offers ?? []).filter((o: any) => o?.listing);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(0,200,117,0.25)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,200,117,0.06)' }}>
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>New Buyer Offers</p>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: '#00C875' }}>{rows.length} pending</p>
        </div>
        <a href="/farmer/marketplace" className="text-xs font-semibold" style={{ color: '#00C875' }}>View all →</a>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((o: any) => (
          <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold capitalize">{o.listing.crop_type} — {o.listing.quantity_kg} kg</p>
              <p className="text-[11px]" style={{ color: 'rgba(241,245,249,0.4)' }}>{timeAgo(o.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black" style={{ color: '#00C875', letterSpacing: '-0.02em' }}>
                UGX {Math.round(o.offered_price).toLocaleString()}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(241,245,249,0.3)' }}>per kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Streaming: Notifications ─────────────────────────────────────────────────

async function SmartAlerts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from('notifications')
    .select('*')
    .eq('farmer_id', userId)
    .order('sent_at', { ascending: false })
    .limit(5);

  supabase.from('notifications').update({ read: true }).eq('farmer_id', userId).eq('read', false).then(() => {});

  const rows = alerts ?? [];
  if (rows.length === 0) return null;

  const T: Record<string, { bg: string; icon: string; color: string }> = {
    rain:   { bg: 'rgba(56,189,248,0.12)',  icon: '🌧️', color: '#38BDF8' },
    price:  { bg: 'rgba(251,191,36,0.12)',  icon: '📈', color: '#FBBF24' },
    pest:   { bg: 'rgba(248,113,113,0.12)', icon: '🐛', color: '#F87171' },
    offer:  { bg: 'rgba(0,200,117,0.12)',   icon: '🤝', color: '#00C875' },
    loan:   { bg: 'rgba(167,139,250,0.12)', icon: '💳', color: '#A78BFA' },
    system: { bg: 'rgba(255,255,255,0.06)', icon: '🔔', color: 'rgba(241,245,249,0.5)' },
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>Smart Alerts</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((a: any) => {
          const cfg = T[a.type] ?? T.system;
          return (
            <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: cfg.bg }}>{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{a.title}</p>
                {a.body && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(241,245,249,0.45)' }}>{a.body}</p>}
              </div>
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'rgba(241,245,249,0.3)' }}>{timeAgo(a.sent_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Static sections ──────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Sell',    href: '/farmer/marketplace', emoji: '🤝', gradient: 'linear-gradient(135deg, #059669, #10B981)' },
    { label: 'Prices',  href: '/farmer/prices',       emoji: '📈', gradient: 'linear-gradient(135deg, #D97706, #FBBF24)' },
    { label: 'Doctor',  href: '/farmer/doctor',       emoji: '🔬', gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
    { label: 'Weather', href: '/farmer/weather',      emoji: '🌤', gradient: 'linear-gradient(135deg, #0284C7, #38BDF8)' },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(({ label, href, emoji, gradient }) => (
        <a key={label} href={href} className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl hover:opacity-85 transition-opacity" style={{ background: gradient }}>
          <span className="text-2xl leading-none">{emoji}</span>
          <span className="text-[11px] font-bold text-white/90">{label}</span>
        </a>
      ))}
    </div>
  );
}

function WalletSnapshot() {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0C1526, #132033)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,200,117,0.15)' }}>💳</div>
          <p className="text-sm font-bold">Kulima Wallet</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>Coming soon</span>
      </div>
      <p className="text-3xl font-black mb-1" style={{ letterSpacing: '-0.04em' }}>UGX 0</p>
      <p className="text-xs mb-4" style={{ color: 'rgba(241,245,249,0.4)' }}>Available balance</p>
      <div className="grid grid-cols-2 gap-3">
        {['Deposit', 'Withdraw'].map((a) => (
          <button key={a} disabled className="py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(241,245,249,0.4)', cursor: 'not-allowed' }}>
            {a === 'Deposit' ? '+ ' : '→ '}{a}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FarmerDashboardPage() {
  const supabase = await createClient();

  // getSession() reads the cookie without a network call to auth servers
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');
  const userId = session.user.id;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-soil)' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* Header streams in with profile data */}
        <Suspense fallback={
          <div className="flex items-center justify-between py-5">
            <div className="space-y-2">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-6 w-36 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="skeleton w-10 h-10 rounded-2xl" />
            </div>
          </div>
        }>
          <DashboardHeader userId={userId} greeting={greeting} />
        </Suspense>

        {/* Quick actions always instant */}
        <QuickActions />

        <div className="space-y-4 mt-4">

          {/* AgriScore — needs profile + listings (sequential, ~2 DB calls, streams in) */}
          <Suspense fallback={<Sk h="120px" />}>
            <AgriScoreSection userId={userId} />
          </Suspense>

          {/* Weather — needs profile (lat/lon) + OpenWeather */}
          <Suspense fallback={<Sk h="240px" />}>
            <WeatherIntelligence userId={userId} />
          </Suspense>

          {/* Seasonal — needs profile (primaryCrop), computed */}
          <Suspense fallback={<Sk h="200px" />}>
            <SeasonalStrategy userId={userId} />
          </Suspense>

          {/* Market prices — needs profile (district) + DB */}
          <Suspense fallback={<Sk h="260px" />}>
            <MarketIntelligence userId={userId} />
          </Suspense>

          {/* Disease alerts — needs profile (primaryCrop), computed */}
          <Suspense fallback={<Sk h="160px" />}>
            <DiseaseRiskPanel userId={userId} />
          </Suspense>

          {/* Buyer offers — needs profile.id + DB */}
          <Suspense fallback={null}>
            <BuyerOffers userId={userId} />
          </Suspense>

          {/* Wallet */}
          <WalletSnapshot />

          {/* Notifications */}
          <Suspense fallback={null}>
            <SmartAlerts userId={userId} />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
