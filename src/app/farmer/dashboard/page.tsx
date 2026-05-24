import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── AgriScore ────────────────────────────────────────────────────────────────

function computeAgriScore(profile: any, listingsCount: number): number {
  let s = 300;
  if (profile?.full_name)             s += 50;
  if (profile?.phone_number)          s += 30;
  if (profile?.location)              s += 30;
  if (profile?.primary_crop)          s += 40;
  if (profile?.latitude && profile?.longitude) s += 150;
  s += Math.min(listingsCount * 50, 200);
  return Math.min(s, 850);
}

function AgriScoreCard({ score }: { score: number }) {
  const pct = Math.round(((score - 300) / (850 - 300)) * 100);
  let label = 'Building';
  let color = '#F87171';
  if (score >= 500) { label = 'Fair';      color = '#FBBF24'; }
  if (score >= 650) { label = 'Good';      color = '#10B981'; }
  if (score >= 780) { label = 'Excellent'; color = '#00C875'; }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.4)' }}>
            AgriScore
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black" style={{ color, letterSpacing: '-0.04em' }}>{score}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}22`, color }}
            >
              {label}
            </span>
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: `${color}18` }}
        >
          🏆
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-2 rounded-full agriscore-bar"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #FBBF24, ${color})`,
          }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px]" style={{ color: 'rgba(241,245,249,0.25)' }}>300 · Building</span>
        <span className="text-[10px]" style={{ color: 'rgba(241,245,249,0.25)' }}>850 · Excellent</span>
      </div>
      <p className="text-xs mt-3" style={{ color: 'rgba(241,245,249,0.4)' }}>
        Add your GPS location, list produce, and complete your profile to improve your score.
      </p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  );
}

function PricesSkeleton() {
  return <div className="skeleton h-56 rounded-2xl" />;
}

function AlertsSkeleton() {
  return <div className="skeleton h-44 rounded-2xl" />;
}

// ─── Streaming: Stats ─────────────────────────────────────────────────────────

async function FarmerStats({ userId, primaryCrop }: { userId: string; primaryCrop: string }) {
  const supabase = await createClient();
  const [areaRes, priceRes] = await Promise.all([
    supabase.from('farms').select('size_hectares').eq('user_id', userId),
    supabase
      .from('market_prices')
      .select('price_per_kg, market_name')
      .eq('crop_type', primaryCrop)
      .order('price_per_kg', { ascending: false })
      .limit(1),
  ]);

  const totalArea = (areaRes.data ?? []).reduce((s: number, f: any) => s + (f.size_hectares ?? 0), 0);
  const bestPrice = priceRes.data?.[0];

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Weather */}
      <div className="stat-card-sky rounded-2xl p-4 flex flex-col gap-1">
        <span className="text-2xl">🌡️</span>
        <p className="text-xl font-black leading-none text-white" style={{ letterSpacing: '-0.03em' }}>28°C</p>
        <p className="text-[10px] text-white/70 leading-tight">Partly cloudy</p>
      </div>

      {/* Farm area */}
      <div className="stat-card-emerald rounded-2xl p-4 flex flex-col gap-1">
        <span className="text-2xl">🏡</span>
        <p className="text-xl font-black leading-none text-white" style={{ letterSpacing: '-0.03em' }}>
          {totalArea > 0 ? totalArea.toFixed(1) : '—'}
        </p>
        <p className="text-[10px] text-white/70 leading-tight">
          {totalArea > 0 ? 'hectares' : 'Add farm'}
        </p>
      </div>

      {/* Best price */}
      <div className="stat-card-amber rounded-2xl p-4 flex flex-col gap-1">
        <span className="text-2xl">💰</span>
        <p className="text-xl font-black leading-none text-white" style={{ letterSpacing: '-0.03em' }}>
          {bestPrice ? `${Math.round(bestPrice.price_per_kg / 1000).toFixed(1)}k` : '—'}
        </p>
        <p className="text-[10px] text-white/70 leading-tight capitalize">
          {bestPrice ? `UGX/kg · ${primaryCrop}` : `No ${primaryCrop} data`}
        </p>
      </div>
    </div>
  );
}

// ─── Static: Quick actions ────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Prices', href: '/farmer/prices', emoji: '📈', gradient: 'linear-gradient(135deg, #6D28D9, #A78BFA)' },
    { label: 'Sell', href: '/farmer/marketplace', emoji: '🤝', gradient: 'linear-gradient(135deg, #059669, #10B981)' },
    { label: 'Doctor', href: '/farmer/doctor', emoji: '🔬', gradient: 'linear-gradient(135deg, #0284C7, #38BDF8)' },
    { label: 'Weather', href: '/farmer/weather', emoji: '🌤', gradient: 'linear-gradient(135deg, #0891B2, #22D3EE)' },
  ];

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(241,245,249,0.3)' }}>
        Quick actions
      </p>
      <div className="grid grid-cols-4 gap-3">
        {actions.map(({ label, href, emoji, gradient }) => (
          <a key={label} href={href} className="action-tile" style={{ background: gradient }}>
            <span className="text-2xl leading-none">{emoji}</span>
            <span className="text-[11px] font-bold text-white/90">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Streaming: Live prices ───────────────────────────────────────────────────

async function LivePrices() {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 864e5).toISOString();
  const { data: prices } = await supabase
    .from('market_prices')
    .select('*')
    .gte('recorded_at', yesterday)
    .order('recorded_at', { ascending: false });

  const rows = prices ?? [];
  const groups: Record<string, any[]> = {};
  rows.forEach((p: any) => {
    if (!groups[p.crop_type]) groups[p.crop_type] = [];
    groups[p.crop_type].push(p);
  });

  const ticker = Object.entries(groups)
    .map(([crop, ps]) => {
      const sorted = [...ps].sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      const pct = sorted[1] ? ((sorted[0].price_per_kg - sorted[1].price_per_kg) / sorted[1].price_per_kg) * 100 : 0;
      return { crop, price: sorted[0].price_per_kg, market: sorted[0].market_name, pct: +pct.toFixed(1) };
    })
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 6);

  if (ticker.length === 0) return null;

  const CROP_COLORS: Record<string, string> = {
    maize: '#FBBF24', beans: '#FB923C', coffee: '#A78BFA',
    rice: '#38BDF8', banana: '#FDE68A', cassava: '#10B981',
    sorghum: '#F472B6', groundnuts: '#00C875', cotton: '#38BDF8', tomato: '#F87171',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Live market prices
        </p>
        <a href="/farmer/prices" className="text-xs font-semibold" style={{ color: 'var(--color-sprout)' }}>See all →</a>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {ticker.map(({ crop, price, market, pct }) => {
          const up = pct >= 0;
          const dotColor = CROP_COLORS[crop.toLowerCase()] ?? '#00C875';
          return (
            <div key={crop} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                <div>
                  <p className="text-sm font-semibold capitalize">{crop}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(241,245,249,0.4)' }}>{market}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">UGX {Math.round(price).toLocaleString()}</p>
                <p className="text-[11px] font-bold" style={{ color: up ? '#00C875' : '#F87171' }}>
                  {up ? '▲' : '▼'} {Math.abs(pct)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streaming: Alerts ────────────────────────────────────────────────────────

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

  const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
    rain:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)',   icon: '🌧️' },
    price:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',   icon: '📈' },
    pest:   { color: '#F87171', bg: 'rgba(248,113,113,0.12)',   icon: '🐛' },
    offer:  { color: '#00C875', bg: 'rgba(0,200,117,0.12)',     icon: '🤝' },
    loan:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: '💳' },
    system: { color: 'rgba(241,245,249,0.5)', bg: 'rgba(255,255,255,0.06)', icon: '🔔' },
  };

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Smart alerts
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((a: any) => {
          const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.system;
          return (
            <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ background: cfg.bg }}
              >
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{a.title}</p>
                {a.body && (
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(241,245,249,0.45)' }}>{a.body}</p>
                )}
              </div>
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'rgba(241,245,249,0.3)' }}>
                {timeAgo(a.sent_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wallet snapshot (static placeholder until wallet table exists) ────────────

function WalletSnapshot() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'linear-gradient(135deg, #0C1526 0%, #132033 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,200,117,0.15)' }}>
            💳
          </div>
          <p className="text-sm font-bold">Kulima Wallet</p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}
        >
          Coming soon
        </span>
      </div>
      <p className="text-3xl font-black mb-1" style={{ letterSpacing: '-0.04em', color: 'var(--color-cream)' }}>UGX 0</p>
      <p className="text-xs mb-4" style={{ color: 'rgba(241,245,249,0.4)' }}>Available balance</p>
      <div className="grid grid-cols-2 gap-3">
        {['Deposit', 'Withdraw'].map((a) => (
          <button
            key={a}
            disabled
            className="py-2.5 rounded-xl text-sm font-bold transition-opacity"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(241,245,249,0.4)', cursor: 'not-allowed' }}
          >
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Fetch profile + notification count in parallel
  const [profileRes, unreadRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, primary_crop, phone_number, location, latitude, longitude, id')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', user.id)
      .eq('read', false),
  ]);

  const profile = profileRes.data as any;
  const name = profile?.full_name ?? 'Farmer';
  const primaryCrop = profile?.primary_crop ?? 'maize';
  const unread = unreadRes.count ?? 0;

  // Listings count for AgriScore
  let listingsCount = 0;
  if (profile?.id) {
    const { count } = await (supabase.from as any)('listings')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', profile.id);
    listingsCount = count ?? 0;
  }

  const agriScore = computeAgriScore(profile, listingsCount);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-soil)' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* ── Header bar ── */}
        <div className="flex items-center justify-between py-5">
          <div>
            <p className="text-xs font-medium" style={{ color: 'rgba(241,245,249,0.4)' }}>{greeting}</p>
            <p className="text-xl font-bold mt-0.5" style={{ letterSpacing: '-0.025em' }}>{name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
              style={{ background: 'var(--color-sprout)', color: '#060B14' }}
            >
              {name[0]?.toUpperCase() ?? 'F'}
            </div>
            <button
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-opacity hover:opacity-75"
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

        <div className="space-y-4">

          {/* ── AgriScore (instant) ── */}
          <AgriScoreCard score={agriScore} />

          {/* ── Stats (streams in) ── */}
          <Suspense fallback={<StatsSkeleton />}>
            <FarmerStats userId={user.id} primaryCrop={primaryCrop} />
          </Suspense>

          {/* ── Quick actions (instant) ── */}
          <QuickActions />

          {/* ── Wallet (instant placeholder) ── */}
          <WalletSnapshot />

          {/* ── Prices (streams in) ── */}
          <Suspense fallback={<PricesSkeleton />}>
            <LivePrices />
          </Suspense>

          {/* ── Alerts (streams in) ── */}
          <Suspense fallback={<AlertsSkeleton />}>
            <SmartAlerts userId={user.id} />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
