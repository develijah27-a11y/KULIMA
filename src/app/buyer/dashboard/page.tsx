import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardShadow: 'var(--d-shadow-card)', purple: '#7C3AED',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location, id').eq('user_id', userId).single();
  return data as any;
});

// ── Stats ─────────────────────────────────────────────────────────────────────

async function BuyerStats({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [listingsRes, pendingRes, ordersRes, walletRes] = await Promise.all([
    (supabase.from as any)('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    (supabase.from as any)('offers')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'pending'),
    (supabase.from as any)('offers')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'accepted'),
    (supabase.from as any)('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const stats = [
    { label: 'Market Listings',  value: listingsRes.count ?? 0,    sub: 'Available now',        icon: '🌾', border: C.greenBright },
    { label: 'Pending Offers',   value: pendingRes.count ?? 0,     sub: 'Awaiting farmer reply', icon: '💬', border: C.amber },
    { label: 'Active Orders',    value: ordersRes.count ?? 0,      sub: 'Accepted deals',        icon: '✅', border: C.blue },
    {
      label: 'Wallet Balance',
      value: `UGX ${Math.round(walletRes?.data?.balance ?? 0).toLocaleString()}`,
      sub: 'Available funds',
      icon: '💳',
      border: C.purple,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Browse Market', href: '/buyer/listings',   emoji: '🌾', bg: 'var(--color-primary-bg)', color: C.green },
    { label: 'My Orders',     href: '/buyer/orders',     emoji: '📦', bg: 'var(--color-sky-bg)',     color: C.blue },
    { label: 'My Offers',     href: '/buyer/requests',   emoji: '💬', bg: 'var(--color-harvest-bg)', color: C.amber },
    { label: 'Deliveries',    href: '/buyer/deliveries', emoji: '🚛', bg: '#EDE9FE',                 color: C.purple },
    { label: 'Wallet',        href: '/buyer/wallet',     emoji: '💳', bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, emoji, bg, color }) => (
          <Link key={label} href={href} prefetch={true}
            className="flex flex-col items-center gap-2 py-4 rounded-xl hover:opacity-85 transition-opacity"
            style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
              {emoji}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Active Offers ─────────────────────────────────────────────────────────────

async function ActiveOffers({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: offers } = await (supabase.from as any)('offers')
    .select(`
      id, offered_price, status, created_at, counter_price, note,
      listing:listings(crop_type, quantity_kg, asking_price, district, farmer_id)
    `)
    .eq('buyer_id', userId)
    .in('status', ['pending', 'countered', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(6);

  const rows = ((offers ?? []) as any[]).filter(o => o?.listing);

  const STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending:  { label: 'Waiting',   color: C.amber,  bg: 'var(--color-harvest-bg)', icon: '⏳' },
    countered:{ label: 'Countered', color: C.blue,   bg: 'var(--color-sky-bg)',     icon: '🔄' },
    accepted: { label: 'Accepted',  color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: '✅' },
  };

  const CROP_EMOJI: Record<string, string> = { maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌', cassava: '🥔', tomato: '🍅' };

  function timeAgo(iso: string) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Active Offers</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Your recent negotiations</p>
        </div>
        <Link href="/buyer/requests" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No active offers</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Browse the market and make an offer to a farmer</p>
          <Link href="/buyer/listings" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Browse Market →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((o: any) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            const crop = o.listing.crop_type?.toLowerCase() ?? '';
            return (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: 'var(--color-primary-bg)' }}>
                    {CROP_EMOJI[crop] ?? '🌾'}
                  </div>
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: C.text }}>
                      {o.listing.crop_type} · {o.listing.quantity_kg} kg
                    </p>
                    <p className="text-[11px]" style={{ color: C.muted }}>
                      {o.listing.district} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: C.text }}>
                    UGX {Math.round(o.counter_price ?? o.offered_price).toLocaleString()}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                    {st.icon} {st.label}
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

// ── Recent Deliveries ─────────────────────────────────────────────────────────

async function RecentDeliveries({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: deliveries } = await (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, cargo_type, cargo_kg, delivery_type, status, estimated_fare, created_at')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })
    .limit(4);

  const rows = (deliveries ?? []) as any[];
  if (rows.length === 0) return null;

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    open:       { label: 'Finding Driver', color: C.amber,  bg: 'var(--color-harvest-bg)' },
    assigned:   { label: 'Driver Assigned',color: C.blue,   bg: 'var(--color-sky-bg)' },
    in_transit: { label: 'On the Way',     color: C.green,  bg: 'var(--color-primary-bg)' },
    delivered:  { label: 'Delivered',      color: C.purple, bg: '#EDE9FE' },
    cancelled:  { label: 'Cancelled',      color: C.red,    bg: 'var(--color-danger-bg)' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Deliveries</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Your transport requests</p>
        </div>
        <Link href="/buyer/deliveries" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {rows.map((d: any) => {
          const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open;
          const typeIcon = d.delivery_type === 'cold' ? '❄️' : d.delivery_type === 'fast' ? '⚡' : '🚛';
          return (
            <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'var(--color-primary-bg)' }}>
                  {typeIcon}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.text }}>
                    {d.pickup_district} → {d.dropoff_district}
                  </p>
                  <p className="text-[11px]" style={{ color: C.muted }}>
                    {d.cargo_kg} kg {d.cargo_type ?? ''} · UGX {Math.round(d.estimated_fare ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Market Listings ───────────────────────────────────────────────────────────

async function FreshListings() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  const rows = listings ?? [];
  const EMOJI: Record<string, string>  = { maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌', cassava: '🥔', tomato: '🍅' };
  const COLORS: Record<string, string> = { maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED', rice: C.blue, banana: '#B45309', cassava: 'var(--color-success)', tomato: 'var(--color-danger)' };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fresh Listings</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Latest from farmers — click to make an offer</p>
        </div>
        <Link href="/buyer/listings" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-2">🌾</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No active listings yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((l: any) => {
            const k = l.crop_type?.toLowerCase() ?? '';
            const color = COLORS[k] ?? C.greenMed;
            return (
              <Link key={l.id} href={`/buyer/listings/${l.id}`} prefetch={true}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:opacity-90 transition-opacity"
                style={{ textDecoration: 'none', display: 'flex' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${color}18` }}>
                    {EMOJI[k] ?? '🌾'}
                  </div>
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: C.text }}>{l.crop_type}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{l.quantity_kg.toLocaleString()} kg · {l.district}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color, letterSpacing: '-0.02em' }}>
                    UGX {Math.round(l.asking_price).toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: C.muted }}>per kg</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Market Pulse ──────────────────────────────────────────────────────────────

async function MarketPulse() {
  const supabase = await createClient();
  const { data: prices } = await supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(40);
  const rows = prices ?? [];
  if (rows.length === 0) return null;

  const groups: Record<string, number[]> = {};
  rows.forEach((p: any) => {
    const k = p.crop_type?.toLowerCase();
    if (k) { if (!groups[k]) groups[k] = []; groups[k].push(p.price_per_kg); }
  });

  const COLORS: Record<string, string> = { maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: C.purple, rice: C.blue, banana: '#B45309', cassava: 'var(--color-success)' };

  const pulse = Object.entries(groups).slice(0, 6).map(([crop, ps]) => ({
    crop, avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    trend: ps.length > 1 ? ((ps[0] - ps[1]) / ps[1] * 100) : 0,
  }));

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Market Pulse</p>
        <Link href="/buyer/listings" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse market →</Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: C.border }}>
        {pulse.map(({ crop, avg, trend }) => {
          const color = COLORS[crop] ?? C.greenMed;
          const up = trend >= 0;
          return (
            <div key={crop} className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-xs font-bold capitalize" style={{ color: C.text }}>{crop}</p>
              </div>
              <p className="text-base font-black" style={{ color, letterSpacing: '-0.03em' }}>UGX {avg.toLocaleString()}</p>
              {Math.abs(trend) > 0.1 && (
                <p className="text-[10px] mt-0.5 font-bold" style={{ color: up ? 'var(--color-success)' : C.red }}>
                  {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Spending summary ──────────────────────────────────────────────────────────

async function SpendingSummary({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: offers } = await (supabase.from as any)('offers')
    .select('offered_price, status, created_at, listing:listings(quantity_kg, crop_type)')
    .eq('buyer_id', userId)
    .in('status', ['accepted', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = ((offers ?? []) as any[]).filter(o => o?.listing);
  if (rows.length === 0) return null;

  const totalSpend = rows.reduce((s: number, o: any) => s + (o.offered_price ?? 0) * (o.listing?.quantity_kg ?? 1), 0);
  const monthRows = rows.filter((o: any) => new Date(o.created_at) > new Date(Date.now() - 30 * 864e5));
  const monthSpend = monthRows.reduce((s: number, o: any) => s + (o.offered_price ?? 0) * (o.listing?.quantity_kg ?? 1), 0);

  const byCrop: Record<string, number> = {};
  rows.forEach((o: any) => {
    const crop = o.listing?.crop_type ?? 'other';
    byCrop[crop] = (byCrop[crop] ?? 0) + (o.offered_price ?? 0) * (o.listing?.quantity_kg ?? 1);
  });
  const topCrop = Object.entries(byCrop).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0C1C35 0%, #1e3a5f 100%)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(59,130,246,0.2)' }}>
          💰
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#60a5fa' }}>Procurement Summary</p>
          <p className="text-sm font-bold text-white">Your purchasing activity overview</p>
        </div>
        <Link href="/buyer/orders" className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 ml-auto" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', textDecoration: 'none' }}>
          View orders →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Spend', value: `UGX ${Math.round(totalSpend).toLocaleString()}`, sub: 'All time' },
          { label: 'This Month', value: `UGX ${Math.round(monthSpend).toLocaleString()}`, sub: `${monthRows.length} deals` },
          { label: 'Top Crop', value: topCrop ? topCrop[0] : '—', sub: topCrop ? `UGX ${Math.round(topCrop[1]).toLocaleString()}` : 'No data' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
            <p className="text-sm font-black text-white capitalize">{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BuyerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;

  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Buyer';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome back, {firstName} 🛒
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Buyer Hub · {profile?.location ?? 'Uganda'}</p>
        </div>
        <Link href="/buyer/listings"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: C.green, textDecoration: 'none' }}>
          Browse Market →
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
        </div>
      }>
        <BuyerStats userId={userId} />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Spending summary (only renders if user has data) */}
      <Suspense fallback={null}>
        <SpendingSummary userId={userId} />
      </Suspense>

      {/* Active Offers + Recent Deliveries (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <ActiveOffers userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <RecentDeliveries userId={userId} />
        </Suspense>
      </div>

      {/* Market Pulse + Fresh Listings (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <MarketPulse />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <FreshListings />
        </Suspense>
      </div>

    </div>
  );
}
