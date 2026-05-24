import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );
}

function PricesSkeleton() {
  return <div className="skeleton h-52 rounded-2xl" />;
}

function AlertsSkeleton() {
  return <div className="skeleton h-40 rounded-2xl" />;
}

// ─── Async streaming sections ─────────────────────────────────────────────────

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

  const stats = [
    { icon: '🌡️', value: '28°C', sub: 'Partly cloudy', accent: 'var(--color-harvest)' },
    {
      icon: '🏡',
      value: totalArea > 0 ? `${totalArea.toFixed(1)} ha` : '—',
      sub: 'Total farm area',
      accent: 'var(--color-sprout)',
    },
    {
      icon: '💰',
      value: bestPrice ? `${Math.round(bestPrice.price_per_kg).toLocaleString()}` : '—',
      sub: bestPrice ? `UGX/kg · ${primaryCrop}` : primaryCrop,
      accent: 'var(--color-harvest)',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ icon, value, sub, accent }) => (
        <div
          key={sub}
          className="rounded-2xl p-4 flex flex-col items-center text-center gap-1"
          style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-2xl">{icon}</span>
          <p className="text-base font-black leading-tight" style={{ color: accent, letterSpacing: '-0.03em' }}>
            {value}
          </p>
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(249,250,251,0.4)' }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

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
      const sorted = [...ps].sort(
        (a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      const pct = sorted[1]
        ? ((sorted[0].price_per_kg - sorted[1].price_per_kg) / sorted[1].price_per_kg) * 100
        : 0;
      return { crop, price: sorted[0].price_per_kg, market: sorted[0].market_name, pct: +pct.toFixed(1) };
    })
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 6);

  if (ticker.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(249,250,251,0.35)' }}>
          Live prices
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {ticker.map(({ crop, price, market, pct }) => {
          const up = pct >= 0;
          return (
            <div key={crop} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold capitalize">{crop}</p>
                <p className="text-[11px]" style={{ color: 'rgba(249,250,251,0.4)' }}>{market}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">UGX {Math.round(price).toLocaleString()}/kg</p>
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: up ? 'var(--color-sprout)' : 'var(--color-clay)' }}
                >
                  {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function SmartAlerts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from('notifications')
    .select('*')
    .eq('farmer_id', userId)
    .order('sent_at', { ascending: false })
    .limit(5);

  // mark read in background (non-blocking)
  supabase.from('notifications').update({ read: true }).eq('farmer_id', userId).eq('read', false).then(() => {});

  const rows = alerts ?? [];
  if (rows.length === 0) return null;

  const DOT: Record<string, string> = {
    rain: '#60a5fa', price: 'var(--color-harvest)', pest: 'var(--color-clay)',
    offer: 'var(--color-sprout)', loan: '#a78bfa', system: 'rgba(249,250,251,0.4)',
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
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(249,250,251,0.35)' }}>
          Smart alerts
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((a: any) => (
          <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ background: DOT[a.type] ?? DOT.system }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{a.title}</p>
              {a.body && <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(249,250,251,0.45)' }}>{a.body}</p>}
            </div>
            <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'rgba(249,250,251,0.3)' }}>
              {timeAgo(a.sent_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Static components (instant) ─────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Prices', href: '/farmer/prices', emoji: '📈' },
    { label: 'Sell Crop', href: '/farmer/marketplace', emoji: '🤝' },
    { label: 'AI Doctor', href: '/farmer/doctor', emoji: '🔬' },
    { label: 'Weather', href: '/farmer/weather', emoji: '🌤' },
  ];
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(249,250,251,0.3)' }}>
        Quick actions
      </p>
      <div className="grid grid-cols-4 gap-3">
        {actions.map(({ label, href, emoji }) => (
          <a
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 py-3.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface2)' }}
          >
            <span className="text-2xl leading-none">{emoji}</span>
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(249,250,251,0.6)' }}>{label}</span>
          </a>
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

  // Fetch only what renders immediately — fast parallel queries
  const [profileRes, unreadRes] = await Promise.all([
    supabase.from('profiles').select('full_name, primary_crop').eq('user_id', user.id).single(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', user.id)
      .eq('read', false),
  ]);

  const name = (profileRes.data as any)?.full_name ?? 'Farmer';
  const primaryCrop = (profileRes.data as any)?.primary_crop ?? 'maize';
  const unread = unreadRes.count ?? 0;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-soil)' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* ── Greeting bar (instant) ── */}
        <div className="flex items-center justify-between py-5">
          <div>
            <p className="text-xs" style={{ color: 'rgba(249,250,251,0.4)' }}>{greeting}</p>
            <p className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>{name}</p>
          </div>
          <button
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-opacity hover:opacity-75"
            style={{ background: 'var(--color-surface2)' }}
            aria-label="Notifications"
          >
            🔔
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: 'var(--color-clay)', color: '#fff' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-4">

          {/* ── Stats (streams in) ── */}
          <Suspense fallback={<StatsSkeleton />}>
            <FarmerStats userId={user.id} primaryCrop={primaryCrop} />
          </Suspense>

          {/* ── Quick actions (instant) ── */}
          <QuickActions />

          {/* ── Live prices (streams in) ── */}
          <Suspense fallback={<PricesSkeleton />}>
            <LivePrices />
          </Suspense>

          {/* ── Smart alerts (streams in) ── */}
          <Suspense fallback={<AlertsSkeleton />}>
            <SmartAlerts userId={user.id} />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
