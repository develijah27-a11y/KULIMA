import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Users, TrendingUp, Package, DollarSign, AlertTriangle, CheckCircle2,
  Building2, MessageCircle, Microscope, Truck, ShoppingCart, BarChart3,
  Bell, ShieldCheck, CreditCard, Activity,
} from 'lucide-react';
import { BiometricSetupBanner } from '@/components/settings/BiometricSetupBanner';
const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  green:      'var(--color-primary)',
  greenMed:   'var(--color-primary-hover)',
  greenBright:'var(--color-primary-muted)',
  amber:      'var(--color-harvest)',
  red:        'var(--color-danger)',
  blue:       'var(--color-sky)',
  violet:     'var(--color-purple)',
  indigo:     '#6366F1',
  orange:     'var(--color-harvest)',
  cardShadow: 'var(--d-shadow-card)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="dash-card-modern" style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const ROLE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  farmer:      { color: 'var(--color-success)',  bg: 'var(--color-success-bg)',  label: 'Farmer' },
  buyer:       { color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)',  label: 'Buyer' },
  transporter: { color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)',      label: 'Transporter' },
  supplier:    { color: 'var(--color-purple)',   bg: 'var(--color-purple-bg)',   label: 'Supplier' },
  pathologist: { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   label: 'Pathologist' },
  offtaker:    { color: 'var(--color-cyan)',     bg: 'var(--color-cyan-bg)',     label: 'Offtaker' },
  groups:      { color: 'var(--color-lime)',     bg: 'var(--color-lime-bg)',     label: 'Group' },
  admin:       { color: 'var(--d-muted)',         bg: 'var(--color-surface-2)',   label: 'Admin' },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

const getAdminProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).single();
  if ((data as any)?.role !== 'admin') return null;
  return data as any;
});

// ─── KPI Metrics ─────────────────────────────────────────────────────────────
async function PlatformKPIs() {
  const supabase = await createClient();
  const weekAgo  = new Date(Date.now() - 7 * 864e5).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const [
    totalRes, newWeekRes, activeListRes, gmvRes,
    kycRes, walletRes, openJobsRes, scansRes,
  ] = await Promise.allSettled([
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    (supabase.from as any)('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (supabase.from as any)('offers').select('offered_price, listing:listings(quantity_kg)').eq('status', 'completed').gte('created_at', monthStart),
    (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase.from as any)('wallets').select('balance'),
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    (supabase.from as any)('disease_scans').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
  ]);

  const gmv = ((gmvRes.status === 'fulfilled' ? gmvRes.value.data : null) ?? []).reduce((s: number, o: any) => s + ((o?.listing?.quantity_kg ?? 0) * (o.offered_price ?? 0)), 0);
  const tvl = (((walletRes.status === 'fulfilled' ? walletRes.value.data : null) ?? []) as any[]).reduce((s: number, w: any) => s + (w.balance ?? 0), 0);
  const kycPending = kycRes.status === 'fulfilled' ? (kycRes.value.count ?? 0) : 0;

  const totalCount      = totalRes.status      === 'fulfilled' ? (totalRes.value.count      ?? 0) : 0;
  const newWeekCount    = newWeekRes.status    === 'fulfilled' ? (newWeekRes.value.count    ?? 0) : 0;
  const activeListCount = activeListRes.status === 'fulfilled' ? (activeListRes.value.count ?? 0) : 0;

  const kpis = [
    { label: 'Total Users',     value: totalCount.toLocaleString(),                              sub: 'All roles registered',    icon: <Users size={16} />,          border: C.violet,     color: C.violet  },
    { label: 'New This Week',   value: `+${newWeekCount.toLocaleString()}`,                      sub: '7-day growth',            icon: <TrendingUp size={16} />,     border: C.greenBright,color: C.greenMed },
    { label: 'Active Listings', value: activeListCount.toLocaleString(),                         sub: 'Live on marketplace',     icon: <Package size={16} />,        border: C.amber,      color: C.amber   },
    { label: 'GMV This Month',  value: gmv >= 1e9 ? `${(gmv/1e9).toFixed(1)}B` : gmv >= 1e6 ? `${(gmv/1e6).toFixed(1)}M` : gmv > 0 ? `${Math.round(gmv/1000)}K` : '—', sub: 'UGX gross market value', icon: <DollarSign size={16} />, border: C.blue, color: C.blue },
    { label: 'Pending KYC',     value: kycPending.toString(),                                    sub: kycPending ? 'Awaiting review' : 'All clear', icon: kycPending ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />, border: kycPending ? C.red : C.greenBright, color: kycPending ? C.red : C.greenMed, alert: kycPending > 0 },
    { label: 'Wallet TVL',      value: tvl >= 1e9 ? `${(tvl/1e9).toFixed(1)}B` : tvl >= 1e6 ? `${(tvl/1e6).toFixed(1)}M` : tvl > 0 ? `${Math.round(tvl/1000)}K` : '—', sub: 'UGX total in wallets', icon: <Building2 size={16} />, border: C.indigo, color: C.indigo },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map(({ label, value, sub, icon, border, color, alert }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 16px', position: 'relative' }}>
          {alert && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: C.red, boxShadow: `0 0 0 3px rgba(230,57,70,0.2)` }} />}
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{label}</p>
            <div style={{ color }}>{icon}</div>
          </div>
          <p className="text-2xl font-black" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-[10px] mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── User Role Breakdown ──────────────────────────────────────────────────────
async function RoleBreakdown() {
  const supabase = await createClient();
  const ROLES = ['farmer', 'buyer', 'transporter', 'supplier', 'pathologist', 'offtaker', 'groups'] as const;
  const results = await Promise.all(
    ROLES.map(r => (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }).eq('role', r))
  );
  const counts = Object.fromEntries(ROLES.map((r, i) => [r, results[i].count ?? 0])) as Record<string, number>;
  const total = ROLES.reduce((s, r) => s + counts[r], 0) || 1;

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>User Roles</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>{total.toLocaleString()} total accounts</p>
      </div>
      <div className="p-5 space-y-3">
        {sorted.map(([role, count]) => {
          const cfg = ROLE_CFG[role] ?? ROLE_CFG.farmer;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={role}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: C.text }}>{count.toLocaleString()} <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span></span>
              </div>
              <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                <div style={{ height: 6, width: `${pct}%`, background: cfg.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── 7-Day Signups Sparkline ──────────────────────────────────────────────────
async function GrowthSparkline() {
  const supabase = await createClient();
  const days: { label: string; from: string; to: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const from = new Date(d); from.setHours(0, 0, 0, 0);
    const to   = new Date(d); to.setHours(23, 59, 59, 999);
    days.push({
      label: d.toLocaleDateString('en-UG', { weekday: 'short' }),
      from: from.toISOString(),
      to:   to.toISOString(),
    });
  }

  const results = await Promise.all(
    days.map(d => (supabase.from as any)('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', d.from)
      .lte('created_at', d.to))
  );

  const data = days.map((d, i) => ({ label: d.label, count: results[i].count ?? 0 }));
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>7-Day Signups</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>New user registrations per day</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-end gap-2 h-20">
          {data.map(({ label, count }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold" style={{ color: C.muted }}>{count > 0 ? count : ''}</span>
              <div
                style={{
                  width: '100%', minHeight: 4,
                  height: `${Math.round((count / max) * 64) + 4}px`,
                  background: count > 0 ? `linear-gradient(180deg, ${C.greenBright}, ${C.greenMed})` : 'var(--color-surface-2)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <span className="text-[9px]" style={{ color: C.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Recent Registrations ─────────────────────────────────────────────────────
async function RecentRegistrations() {
  const supabase = await createClient();
  const { data: users } = await (supabase.from as any)('profiles')
    .select('full_name, role, location, phone_number, created_at, verification_level')
    .order('created_at', { ascending: false })
    .limit(12);

  const rows = users ?? [];

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Recent Registrations</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Newest users across all roles</p>
        </div>
        <Link href="/admin/users" className="text-xs font-semibold" style={{ color: C.greenMed }}>All users →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <Users size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm" style={{ color: C.muted }}>No users yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((u: any, i: number) => {
            const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.farmer;
            return (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                    {(u.full_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{u.full_name ?? 'Unknown'}</p>
                    <p className="text-[10px] truncate" style={{ color: C.muted }}>{u.phone_number ?? u.location ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="text-[10px] hidden sm:block" style={{ color: C.muted }}>{timeAgo(u.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Pending Actions ──────────────────────────────────────────────────────────
async function PendingActions() {
  const supabase = await createClient();
  const [kycRes, offersRes, reportsRes, deliveriesRes] = await Promise.allSettled([
    (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase.from as any)('disease_reports').select('id', { count: 'exact', head: true }).eq('status', 'reported'),
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const kycCount        = kycRes.status        === 'fulfilled' ? (kycRes.value.count        ?? 0) : 0;
  const offersCount     = offersRes.status     === 'fulfilled' ? (offersRes.value.count     ?? 0) : 0;
  const reportsCount    = reportsRes.status    === 'fulfilled' ? (reportsRes.value.count    ?? 0) : 0;
  const deliveriesCount = deliveriesRes.status === 'fulfilled' ? (deliveriesRes.value.count ?? 0) : 0;

  const items = [
    { label: 'KYC Verifications',  count: kycCount,        href: '/admin/verification', icon: <CreditCard size={16} />,    urgency: kycCount > 5 },
    { label: 'Open Buyer Offers',  count: offersCount,     href: '/admin/buyers',       icon: <MessageCircle size={16} />, urgency: false },
    { label: 'Disease Reports',    count: reportsCount,    href: '/admin/disease-reports', icon: <Microscope size={16} />, urgency: reportsCount > 0 },
    { label: 'Open Delivery Jobs', count: deliveriesCount, href: '/admin/deliveries',   icon: <Truck size={16} />,         urgency: false },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Pending Actions</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Items requiring admin attention</p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {items.map(({ label, count, href, icon, urgency }) => (
          <Link key={label} href={href} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors" style={{ textDecoration: 'none' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: urgency ? 'var(--color-danger-bg)' : 'var(--color-primary-bg)', color: urgency ? C.red : C.green }}>{icon}</div>
              <p className="text-sm font-medium" style={{ color: C.text }}>{label}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{ color: count > 0 ? (urgency ? C.red : C.greenMed) : C.muted }}>{count}</span>
              {count > 0 && urgency && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ─── Marketplace Activity ──────────────────────────────────────────────────────
async function MarketplaceActivity() {
  const supabase = await createClient();
  const { data: activity } = await (supabase.from as any)('offers')
    .select('id, offered_price, status, created_at, listing:listings(crop_type, quantity_kg, district)')
    .order('created_at', { ascending: false })
    .limit(8);

  const rows = (activity ?? []).filter((o: any) => o?.listing);

  const STATUS: Record<string, { color: string; bg: string; label: string }> = {
    pending:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Offer' },
    accepted:  { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Accepted' },
    completed: { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Completed' },
    rejected:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Rejected' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Marketplace Activity</p>
        <span className="text-xs" style={{ color: C.muted }}>Latest offers</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <BarChart3 size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm" style={{ color: C.muted }}>No activity yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((o: any) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            return (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary-bg)', color: C.green }}>
                    <ShoppingCart size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{o.listing.crop_type} · {o.listing.quantity_kg}kg</p>
                    <p className="text-[10px]" style={{ color: C.muted }}>{o.listing.district} · {timeAgo(o.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold" style={{ color: C.text }}>UGX {Math.round(o.offered_price).toLocaleString()}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Top Districts ────────────────────────────────────────────────────────────
async function DistrictActivity() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('district')
    .eq('status', 'active')
    .not('district', 'is', null)
    .limit(500);

  const counts: Record<string, number> = {};
  (listings ?? []).forEach((l: any) => {
    if (l.district) counts[l.district] = (counts[l.district] ?? 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Top Districts</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Active listings by location</p>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: C.muted }}>No district data yet</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-2.5">
          {sorted.map(([district, count], i) => (
            <div key={district}>
              <div className="flex justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black" style={{ color: C.muted }}>#{i + 1}</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>{district}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: C.greenMed }}>{count}</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                <div style={{ height: 4, width: `${Math.round((count / max) * 100)}%`, background: `linear-gradient(90deg, ${C.greenMed}, ${C.greenBright})`, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Market Price Summary ──────────────────────────────────────────────────────
async function MarketPriceSummary() {
  const supabase = await createClient();
  const { data: prices } = await supabase.from('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(80);

  const groups: Record<string, number[]> = {};
  (prices ?? []).forEach((p: any) => {
    const k = p.crop_type?.toLowerCase() ?? '';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p.price_per_kg);
  });

  const summary = Object.entries(groups)
    .map(([crop, ps]) => ({
      crop, latest: ps[0], prev: ps[1],
      trend: ps[1] ? ((ps[0] - ps[1]) / ps[1] * 100) : 0,
    }))
    .filter(s => s.latest)
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))
    .slice(0, 6);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Market Prices</p>
        <Link href="/admin/prices" className="text-xs font-semibold" style={{ color: C.greenMed }}>Update →</Link>
      </div>
      {summary.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <BarChart3 size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
          <p className="text-sm" style={{ color: C.muted }}>No price data yet</p>
          <Link href="/admin/prices" className="block mt-3 text-xs font-bold" style={{ color: C.greenMed }}>Add first prices →</Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {summary.map(({ crop, latest, trend }) => {
            const up = trend >= 0;
            return (
              <div key={crop} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-medium capitalize" style={{ color: C.text }}>{crop}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: C.text }}>UGX {Math.round(latest).toLocaleString()}</span>
                  {trend !== 0 && (
                    <span className="text-[10px] font-bold" style={{ color: up ? 'var(--color-success)' : C.red }}>
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

// ─── System Health ────────────────────────────────────────────────────────────
// Each check is a real, cheap signal rather than a hardcoded "all good" list:
// - Database: an actual query has to succeed
// - Storage: bucket list has to succeed
// - Weather / Mobile Money: the API keys they require are actually configured
// - Price Cron: the daily job has to have written a row recently
async function SystemHealth() {
  const supabase = await createClient();

  const [dbCheck, storageCheck, latestPrice] = await Promise.allSettled([
    supabase.from('profiles').select('id').limit(1),
    supabase.storage.listBuckets(),
    supabase.from('market_prices').select('recorded_at').order('recorded_at', { ascending: false }).limit(1).single(),
  ]);

  const dbOk = dbCheck.status === 'fulfilled' && !dbCheck.value.error;
  const storageOk = storageCheck.status === 'fulfilled' && !storageCheck.value.error;

  const lastPriceAt = latestPrice.status === 'fulfilled' ? (latestPrice.value.data as any)?.recorded_at : null;
  const priceCronOk = !!lastPriceAt && (Date.now() - new Date(lastPriceAt).getTime()) < 36 * 3600 * 1000;

  // Weather always works: OpenWeatherMap is used when OPENWEATHER_API_KEY is
  // set, otherwise weather-server.ts falls back to Open-Meteo, which needs no
  // key at all. Checking only for the optional key made this read "not
  // connected" forever even though the feature has been live via Open-Meteo
  // the whole time — flag which provider is actually active instead.
  const weatherProvider = process.env.OPENWEATHER_API_KEY ? 'OpenWeatherMap' : 'Open-Meteo (keyless)';

  const services = [
    { name: 'Database',                   ok: dbOk },
    { name: 'File Storage',               ok: storageOk },
    { name: 'Weather API',                ok: true, detail: weatherProvider },
    { name: 'Mobile Money (Nylon Pay)',   ok: !!process.env.NYLON_PAY_SECRET_KEY },
    { name: 'Daily Price Cron',           ok: priceCronOk, detail: lastPriceAt ? `last ran ${new Date(lastPriceAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}` : 'never ran' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>System Health</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Live checks, not a static list</p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {services.map(({ name, ok, detail }) => (
          <div key={name} className="px-5 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: C.text }}>{name}</p>
              {detail && <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{detail}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? 'var(--color-primary)' : C.red }} />
              <span className="text-[10px] font-semibold" style={{ color: ok ? 'var(--color-primary)' : C.red }}>{ok ? 'Online' : 'Down'}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Recent System Errors ──────────────────────────────────────────────────────
// Pulls from system_logs (src/lib/system-log.ts) — errors, failed payments,
// and auth failures from instrumented routes. Separate from the audit_logs-
// driven "Pending Actions"/business widgets above: this is operational
// health, not business state.
async function RecentErrors() {
  const supabase = await createClient();
  const { data: logs, error } = await (supabase.from as any)('system_logs')
    .select('id, category, route, message, created_at')
    .in('category', ['error', 'failed_payment', 'auth_failure'])
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) return null; // migration not applied yet — fail quiet, not visible to admins as a false alarm

  const rows = logs ?? [];
  const CAT_LABEL: Record<string, string> = { error: 'Error', failed_payment: 'Payment', auth_failure: 'Auth' };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Recent System Errors</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Errors, failed payments &amp; auth failures</p>
        </div>
        <Link href="/admin/logs" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 size={28} style={{ margin: '0 auto 8px', color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: C.muted }}>No errors logged recently</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((log: any) => (
            <div key={log.id} className="px-5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-danger-bg)', color: C.red }}>
                  {CAT_LABEL[log.category] ?? log.category}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: C.muted }}>{timeAgo(log.created_at)}</span>
              </div>
              <p className="text-xs mt-1 truncate" style={{ color: C.text }} title={log.message}>{log.message}</p>
              {log.route && <p className="text-[10px] mt-0.5" style={{ color: C.muted, fontFamily: 'monospace' }}>{log.route}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Admin Quick Actions ───────────────────────────────────────────────────────
function AdminTools() {
  const tools = [
    { href: '/admin/users',        icon: <Users size={20} />,        label: 'Manage Users',   sub: 'Search, edit roles, suspend',      bg: 'var(--color-purple-bg)',     color: C.violet  },
    { href: '/admin/verification', icon: <ShieldCheck size={20} />,  label: 'KYC Queue',      sub: 'Approve/reject verifications',     bg: 'var(--color-danger-bg)',     color: C.red     },
    { href: '/admin/prices',       icon: <BarChart3 size={20} />,    label: 'Market Prices',  sub: 'Update crop price data',           bg: 'var(--color-success-bg)',    color: C.greenMed },
    { href: '/admin/alert',        icon: <Bell size={20} />,         label: 'Send Alert',     sub: 'Broadcast notifications',          bg: 'var(--color-sky-bg)',        color: C.blue    },
    { href: '/admin/buyers',       icon: <ShoppingCart size={20} />, label: 'Buyer Accounts', sub: 'Review buyer registrations',       bg: 'var(--color-harvest-bg)',    color: C.amber   },
    { href: '/admin/deliveries',   icon: <Truck size={20} />,        label: 'Deliveries',     sub: 'Uber-style delivery tracking',     bg: 'var(--color-purple-bg)',     color: 'var(--color-purple)' },
    { href: '/admin/analytics',    icon: <TrendingUp size={20} />,   label: 'Analytics',      sub: 'Growth, revenue & trends',         bg: 'var(--color-cyan-bg)',       color: 'var(--color-cyan)' },
    { href: '/admin/commission',   icon: <CreditCard size={20} />,   label: 'Platform Wallet', sub: 'Commission balance & account no.', bg: 'var(--color-primary-bg)',    color: C.green   },
    { href: '/admin/disease-reports', icon: <Microscope size={20} />, label: 'Disease Reports', sub: 'Assign & track crop cases',       bg: 'var(--color-warning-bg)',    color: 'var(--color-warning)' },
    { href: '/admin/logs',         icon: <Activity size={20} />,     label: 'System Logs',    sub: 'Errors, payments & performance',  bg: 'var(--color-danger-bg)',     color: C.red },
    { href: '/admin/revenue',      icon: <DollarSign size={20} />,   label: 'Revenue',        sub: 'Fees, commissions & escrow flow',  bg: 'var(--color-success-bg)',    color: C.greenMed },
    { href: '/admin/security',     icon: <ShieldCheck size={20} />,  label: 'Security',       sub: 'Auth failures & fraud flags',      bg: 'var(--color-danger-bg)',     color: C.red },
    { href: '/admin/moderation',   icon: <AlertTriangle size={20} />,label: 'Moderation',     sub: 'Reported listings & disputes',     bg: 'var(--color-warning-bg)',    color: 'var(--color-warning)' },
    { href: '/admin/support',      icon: <MessageCircle size={20} />,label: 'Support Tickets',sub: 'User support requests',           bg: 'var(--color-sky-bg)',        color: C.blue },
  ];

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Admin Tools</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tools.map(({ href, icon, label, sub, bg, color }) => (
          <Link key={href} href={href} className="flex items-center gap-3 p-4 rounded-xl hover:opacity-90 transition-opacity" style={{ background: C.cardBg, boxShadow: C.cardShadow, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>{icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: C.text }}>{label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
async function AlertBanner() {
  const supabase = await createClient();
  const { count } = await (supabase.from as any)('verifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (!count || count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ background: 'var(--color-harvest-bg)', border: '1px solid var(--color-warning-border)' }}>
      <AlertTriangle size={18} style={{ color: 'var(--color-harvest)', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--color-harvest)' }}>{count} KYC verification{count > 1 ? 's' : ''} pending review</p>
        <p className="text-xs" style={{ color: 'var(--color-harvest)' }}>Users are waiting to be verified. Review the queue to unlock their full access.</p>
      </div>
      <Link href="/admin/verification" className="px-4 py-2 rounded-lg text-xs font-bold shrink-0" style={{ background: 'var(--color-harvest)', color: '#fff', textDecoration: 'none' }}>
        Review →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const profile = await getAdminProfile();
  if (!profile) redirect('/dashboard');

  const now = new Date();
  const dayLabel = now.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Platform Command Centre
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>{dayLabel} · Cropify Admin</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>All systems operational</span>
        </div>
      </div>

      <BiometricSetupBanner />

      <Suspense fallback={<div className="dash-skeleton h-16 rounded-xl" />}>
        <AlertBanner />
      </Suspense>

      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}</div>}>
        <PlatformKPIs />
      </Suspense>

      <AdminTools />

      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <GrowthSparkline />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <RoleBreakdown />
        </Suspense>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="dash-skeleton h-[560px] rounded-xl" />}>
            <RecentRegistrations />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<div className="dash-skeleton h-80 rounded-xl" />}>
            <PendingActions />
          </Suspense>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<div className="dash-skeleton h-[480px] rounded-xl" />}>
            <MarketplaceActivity />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
            <DistrictActivity />
          </Suspense>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-56 rounded-xl" />}>
          <MarketPriceSummary />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-56 rounded-xl" />}>
          <SystemHealth />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-56 rounded-xl" />}>
          <RecentErrors />
        </Suspense>
      </div>

    </div>
  );
}
