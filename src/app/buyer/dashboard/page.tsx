import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ShoppingBag, MessageCircle, CheckCircle2, CreditCard, Package,
  Truck, Snowflake, Zap, DollarSign, Leaf, Clock, RefreshCw,
} from 'lucide-react';
import { VerificationBanner } from '@/components/trust/VerificationBanner';
import { type VerificationLevel } from '@/lib/trust';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardShadow: 'var(--d-shadow-card)', purple: 'var(--color-purple)',
} as const;

const CROP_COLORS: Record<string, string> = {
  maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED',
  rice: 'var(--color-sky)', banana: '#B45309', cassava: 'var(--color-success)', tomato: 'var(--color-danger)',
};

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location, id, verification_level').eq('user_id', userId).single();
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
    { label: 'Farmers Selling', value: listingsRes.count ?? 0,    sub: 'Available to buy now',   icon: <ShoppingBag size={18} />,   border: C.greenBright },
    { label: 'Offers',       value: pendingRes.count ?? 0,     sub: 'Waiting for farmer reply',icon: <MessageCircle size={18} />, border: C.amber },
    { label: 'Orders',       value: ordersRes.count ?? 0,      sub: 'Deals accepted',         icon: <CheckCircle2 size={18} />,  border: C.blue },
    {
      label: 'Wallet Balance',
      value: `UGX ${Math.round(walletRes?.data?.balance ?? 0).toLocaleString()}`,
      sub: 'Money in your wallet',
      icon: <CreditCard size={18} />,
      border: C.purple,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <div style={{ color: border }}>{icon}</div>
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
    { label: 'Browse Market', href: '/buyer/listings',   icon: <ShoppingBag size={20} />,   bg: 'var(--color-primary-bg)', color: C.green  },
    { label: 'Orders',     href: '/buyer/orders',     icon: <Package size={20} />,       bg: 'var(--color-sky-bg)',     color: C.blue   },
    { label: 'Offers',     href: '/buyer/requests',   icon: <MessageCircle size={20} />, bg: 'var(--color-harvest-bg)', color: C.amber  },
    { label: 'Deliveries',    href: '/buyer/deliveries', icon: <Truck size={20} />,         bg: 'var(--color-purple-bg)', color: C.purple },
    { label: 'Wallet',        href: '/buyer/wallet',     icon: <CreditCard size={20} />,    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, icon, bg, color }) => (
          <Link key={label} href={href} prefetch={true}
            className="press-link flex flex-col items-center gap-2 py-4 rounded-xl"
            style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--tile-icon-bg)', color }}>
              {icon}
            </div>
            <span className="text-[11px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
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

  const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:  { label: 'Waiting',   color: C.amber,               bg: 'var(--color-harvest-bg)', icon: <Clock size={10} /> },
    countered:{ label: 'Countered', color: C.blue,                bg: 'var(--color-sky-bg)',     icon: <RefreshCw size={10} /> },
    accepted: { label: 'Accepted',  color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: <CheckCircle2 size={10} /> },
  };

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
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>My Offers</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Your recent price talks with farmers</p>
        </div>
        <Link href="/buyer/requests" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <MessageCircle size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm font-medium" style={{ color: C.muted }}>No offers yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Browse the market and make an offer to buy produce</p>
          <Link href="/buyer/listings" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Browse Market →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((o: any) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            const crop = o.listing.crop_type?.toLowerCase() ?? '';
            const cropColor = CROP_COLORS[crop] ?? C.greenMed;
            return (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${cropColor}18`, color: cropColor }}>
                    <Leaf size={15} />
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
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {st.icon}{st.label}
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
    open:       { label: 'Finding Driver',  color: C.amber,  bg: 'var(--color-harvest-bg)' },
    assigned:   { label: 'Driver Assigned', color: C.blue,   bg: 'var(--color-sky-bg)' },
    in_transit: { label: 'On the Way',      color: C.green,  bg: 'var(--color-primary-bg)' },
    delivered:  { label: 'Delivered',       color: C.purple, bg: 'var(--color-purple-bg)' },
    cancelled:  { label: 'Cancelled',       color: C.red,    bg: 'var(--color-danger-bg)' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Recent Deliveries</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Produce being transported to you</p>
        </div>
        <Link href="/buyer/deliveries" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {rows.map((d: any) => {
          const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open;
          const typeIcon = d.delivery_type === 'cold' ? <Snowflake size={16} /> : d.delivery_type === 'fast' ? <Zap size={16} /> : <Truck size={16} />;
          const typeColor = d.delivery_type === 'cold' ? C.blue : d.delivery_type === 'fast' ? C.amber : C.green;
          return (
            <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-bg)', color: typeColor }}>
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
  const COLORS: Record<string, string> = {
    maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED',
    rice: 'var(--color-sky)', banana: '#B45309', cassava: 'var(--color-success)', tomato: 'var(--color-danger)',
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>New Produce</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Fresh from farmers — tap to make an offer</p>
        </div>
        <Link href="/buyer/listings" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Leaf size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
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
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}18`, color }}>
                    <Leaf size={15} />
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

  const COLORS: Record<string, string> = {
    maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: C.purple,
    rice: C.blue, banana: '#B45309', cassava: 'var(--color-success)',
  };

  const pulse = Object.entries(groups).slice(0, 6).map(([crop, ps]) => ({
    crop, avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    trend: ps.length > 1 ? ((ps[0] - ps[1]) / ps[1] * 100) : 0,
  }));

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Market Pulse</p>
        <Link href="/buyer/listings" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse market →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {pulse.map(({ crop, avg, trend }) => {
          const color = COLORS[crop] ?? C.greenMed;
          const up = trend >= 0;
          return (
            <div key={crop} className="rounded-xl px-4 py-3" style={{ background: 'var(--color-surface-2)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <p className="text-xs font-bold capitalize" style={{ color: C.text }}>{crop}</p>
                </div>
                {Math.abs(trend) > 0.1 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      color: up ? 'var(--color-success)' : C.red,
                      background: up ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    }}
                  >
                    {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-lg font-black leading-none" style={{ color, letterSpacing: '-0.03em' }}>
                UGX {avg.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: C.muted }}>per kg</p>
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
          <DollarSign size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#60a5fa' }}>Buying Summary</p>
          <p className="text-sm font-bold text-white">How much you have spent on produce</p>
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

// ── Welcome Header ────────────────────────────────────────────────────────────

async function WelcomeHeader({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Buyer';
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Welcome back, {firstName}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Buyer · {profile?.location ?? 'Uganda'}</p>
      </div>
      <Link href="/buyer/listings"
        className="px-4 py-2 rounded-xl text-sm font-bold text-white"
        style={{ background: C.green, textDecoration: 'none' }}>
        Browse Market →
      </Link>
    </div>
  );
}

// ── Streaming: Verification prompt ─────────────────────────────────────────────

async function VerifyPrompt({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  return (
    <VerificationBanner
      level={(profile?.verification_level as VerificationLevel) ?? 'none'}
      verifyHref="/buyer/verify"
      headline="Get verified — buy with confidence"
      benefit="Faster order approval and access to bulk sourcing"
      requiredDocsLabel="national ID, a selfie, and business registration"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BuyerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      <Suspense fallback={null}>
        <VerifyPrompt userId={userId} />
      </Suspense>

      <Suspense fallback={
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="dash-skeleton h-6 w-52 rounded-lg" />
            <div className="dash-skeleton h-4 w-32 rounded-lg" />
          </div>
          <div className="dash-skeleton h-9 w-36 rounded-xl" />
        </div>
      }>
        <WelcomeHeader userId={userId} />
      </Suspense>

      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
        </div>
      }>
        <BuyerStats userId={userId} />
      </Suspense>

      <QuickActions />

      <Suspense fallback={null}>
        <SpendingSummary userId={userId} />
      </Suspense>

      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <ActiveOffers userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <RecentDeliveries userId={userId} />
        </Suspense>
      </div>

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
