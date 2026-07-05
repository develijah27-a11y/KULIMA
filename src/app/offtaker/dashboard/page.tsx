import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  FileText, Users, CreditCard, DollarSign,
  Search, Star, BarChart3, Send,
  TrendingUp, Leaf, Clock, Truck,
} from 'lucide-react';
import { VerificationBanner } from '@/components/trust/VerificationBanner';
import { type VerificationLevel } from '@/lib/trust';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)', purple: 'var(--color-purple)',
  cardShadow: 'var(--d-shadow-card)',
} as const;

const CROP_COLORS: Record<string, string> = {
  maize: 'var(--color-harvest)', coffee: '#7C3AED', beans: 'var(--color-danger)',
  rice: 'var(--color-sky)', banana: 'var(--color-harvest)', cassava: 'var(--color-success)', tomato: 'var(--color-danger)',
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

async function OfftakerStats({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [contractsRes, suppliersRes, walletRes, pendingPayRes] = await Promise.allSettled([
    (supabase.from as any)('offtaker_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('offtaker_id', userId)
      .eq('status', 'active'),
    (supabase.from as any)('offtaker_contracts')
      .select('farmer_id')
      .eq('offtaker_id', userId)
      .eq('status', 'active'),
    (supabase.from as any)('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle(),
    (supabase.from as any)('offtaker_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('offtaker_id', userId)
      .eq('payment_status', 'pending'),
  ]);

  const contractsCount  = contractsRes.status   === 'fulfilled' ? (contractsRes.value.count   ?? 0) : 0;
  const suppliersData   = suppliersRes.status    === 'fulfilled' ? (suppliersRes.value.data    ?? []) : [];
  const walletBal       = walletRes.status       === 'fulfilled' ? (walletRes.value.data?.balance ?? 0) : 0;
  const pendingPayCount = pendingPayRes.status   === 'fulfilled' ? (pendingPayRes.value.count  ?? 0) : 0;
  const uniqueSuppliers = new Set(suppliersData.map((r: any) => r.farmer_id)).size;

  const stats = [
    { label: 'Active Deals',       value: contractsCount,                                      icon: <FileText size={18} />,   sub: 'Running agreements',       border: C.greenBright },
    { label: 'Farmers',        value: uniqueSuppliers,                                     icon: <Users size={18} />,      sub: 'Farmers supplying you',    border: C.blue },
    { label: 'Unpaid Bills',      value: pendingPayCount,                                     icon: <CreditCard size={18} />, sub: 'Not yet paid',             border: pendingPayCount ? C.amber : C.muted },
    { label: 'Wallet Balance',    value: `UGX ${Math.round(walletBal).toLocaleString()}`,     icon: <DollarSign size={18} />, sub: 'Money in your wallet',     border: C.purple },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon, sub, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <div style={{ color: border }}>{icon}</div>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'New Deal',        href: '/offtaker/pipeline/new',    icon: <FileText size={20} />,  bg: 'var(--color-primary-bg)', color: C.green  },
    { label: 'Find Farmers',   href: '/offtaker/pipeline',        icon: <Search size={20} />,    bg: 'var(--color-sky-bg)',     color: C.blue   },
    { label: 'Rate Farmer',    href: '/offtaker/scorecard',       icon: <Star size={20} />,      bg: 'var(--color-harvest-bg)', color: C.amber  },
    { label: 'Reports',     href: '/offtaker/spend',           icon: <BarChart3 size={20} />, bg: 'var(--color-purple-bg)',  color: C.purple },
    { label: 'Send Offer',     href: '/offtaker/pipeline',        icon: <Send size={20} />,      bg: 'var(--color-danger-bg)',  color: C.red    },
    { label: 'Book Delivery',  href: '/offtaker/deliveries/new',  icon: <Truck size={20} />,     bg: 'var(--color-primary-bg)', color: C.green  },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4">
        {actions.map(({ label, href, icon, bg, color }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-2 py-4 rounded-xl hover:opacity-85 transition-opacity" style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--tile-icon-bg)', color }}>
              {icon}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

async function MarketIntelligence() {
  const supabase = await createClient();
  const { data: prices } = await supabase.from('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(50);

  const rows = prices ?? [];
  const groups: Record<string, number[]> = {};
  rows.forEach((p: any) => {
    const k = p.crop_type?.toLowerCase() ?? '';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p.price_per_kg);
  });

  const insights = Object.entries(groups)
    .map(([crop, ps]) => ({
      crop,
      latest: ps[0],
      prev: ps[1],
      trend: ps[1] ? ((ps[0] - ps[1]) / ps[1] * 100) : 0,
    }))
    .filter(i => i.latest)
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))
    .slice(0, 4);

  return (
    <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0C1C35 0%, #1e3a5f 100%)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
          <TrendingUp size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#60a5fa' }}>Price Trends</p>
          <p className="text-sm font-bold text-white">Latest crop prices</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Agree deals now when prices are good for you</p>
        </div>
      </div>

      {insights.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {insights.map(({ crop, latest, trend }) => {
            const up = trend >= 0;
            return (
              <div key={crop} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold text-white capitalize mb-1">{crop}</p>
                <p className="text-base font-black text-white">UGX {Math.round(latest).toLocaleString()}</p>
                <p className="text-[10px] mt-0.5 font-bold" style={{ color: up ? '#4ade80' : '#f87171' }}>
                  {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>No price data available yet</p>
      )}
    </div>
  );
}

async function ActiveContracts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: contracts, error } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, farmer_name, district, delivery_date, status, payment_status')
    .eq('offtaker_id', userId)
    .eq('status', 'active')
    .order('delivery_date', { ascending: true })
    .limit(5);

  const rows = error ? [] : (contracts ?? []);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Active Deals</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Closest delivery date first</p>
        </div>
        <Link href="/offtaker/pipeline" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <FileText size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm font-bold" style={{ color: C.text }}>No active deals yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Create agreements with farmers to secure your supply</p>
          <Link href="/offtaker/pipeline/new" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Create First Deal →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((c: any) => {
            const k = c.crop_type?.toLowerCase() ?? '';
            const cropColor = CROP_COLORS[k] ?? C.greenMed;
            const daysUntil = Math.ceil((new Date(c.delivery_date).getTime() - Date.now()) / 864e5);
            const urgent = daysUntil <= 7;
            return (
              <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: urgent ? 'var(--color-harvest-bg)' : `${cropColor}18`, color: urgent ? C.amber : cropColor }}>
                    <Leaf size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: C.text }}>{c.crop_type} · {c.quantity_kg.toLocaleString()} kg</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{c.farmer_name ?? c.district} · Delivery {new Date(c.delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: C.text }}>UGX {Math.round(c.price_ugx ?? 0).toLocaleString()}</p>
                  {urgent && (
                    <span className="text-[10px] font-bold flex items-center gap-1 justify-end" style={{ color: C.amber }}>
                      <Clock size={9} /> {daysUntil}d left
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

async function AvailableSupply() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  const rows = listings ?? [];

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Farmers Selling</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Produce ready to buy now</p>
        </div>
        <Link href="/offtaker/pipeline" className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Leaf size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm font-medium" style={{ color: C.muted }}>No farmers selling right now</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((l: any) => {
            const k = l.crop_type?.toLowerCase() ?? '';
            const color = CROP_COLORS[k] ?? C.greenMed;
            return (
              <Link key={l.id} href="/offtaker/pipeline" className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors" style={{ textDecoration: 'none' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                    <Leaf size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{l.crop_type}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{l.quantity_kg.toLocaleString()} kg · {l.district}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color }}>UGX {Math.round(l.asking_price).toLocaleString()}</p>
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

async function SupplierScorecard({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: scorecards, error } = await (supabase.from as any)('offtaker_scorecards')
    .select('farmer_name, crop_type, reliability_score, quality_score, total_kg, district')
    .eq('offtaker_id', userId)
    .order('reliability_score', { ascending: false })
    .limit(5);

  const rows = error ? [] : (scorecards ?? []);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Farmer Ratings</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Your best-performing farmers</p>
        </div>
        <Link href="/offtaker/scorecard" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Star size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm font-medium" style={{ color: C.muted }}>No ratings yet</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Rate a farmer after each completed deal</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((s: any, i: number) => {
            const score = ((s.reliability_score + s.quality_score) / 2).toFixed(1);
            const color = parseFloat(score) >= 4 ? 'var(--color-success)' : parseFloat(score) >= 3 ? 'var(--color-harvest)' : C.red;
            return (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: 'var(--color-primary-bg)', color: C.green }}>
                    {s.farmer_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{s.farmer_name}</p>
                    <p className="text-[11px] capitalize" style={{ color: C.muted }}>{s.crop_type} · {s.total_kg?.toLocaleString()} kg delivered</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-black" style={{ color, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={12} />{score}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default async function OfftakerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;
  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Partner';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      <VerificationBanner
        level={(profile?.verification_level as VerificationLevel) ?? 'none'}
        verifyHref="/offtaker/verify"
        requiredDocsLabel="national ID and a selfie"
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Bulk Buyer · {profile?.location ?? 'Uganda'}</p>
        </div>
        <Link href="/offtaker/pipeline/new" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.blue, textDecoration: 'none' }}>
          + New Contract
        </Link>
      </div>

      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <OfftakerStats userId={userId} />
      </Suspense>

      <QuickActions />

      <Suspense fallback={<div className="dash-skeleton h-36 rounded-xl" />}>
        <MarketIntelligence />
      </Suspense>

      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <ActiveContracts userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <AvailableSupply />
        </Suspense>
      </div>

      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
        <SupplierScorecard userId={userId} />
      </Suspense>

    </div>
  );
}
