import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB',
  cardBg: '#FFFFFF', green: '#1B4332', greenBright: '#52B788', greenMed: '#40916C',
  amber: '#F4A261', red: '#E63946', blue: '#0077B6', violet: '#7C3AED',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

async function PlatformStats() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [farmersRes, newFarmersRes, listingsRes, dealsRes] = await Promise.all([
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    (supabase.from as any)('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (supabase.from as any)('offers').select('offered_price, listing:listings(quantity_kg)').eq('status', 'completed').gte('created_at', monthStart),
  ]);

  const gmv = (dealsRes.data ?? []).reduce(
    (sum: number, o: any) => sum + ((o?.listing?.quantity_kg ?? 0) * (o.offered_price ?? 0)), 0
  );

  const stats = [
    { label: 'Total Users', value: (farmersRes.count ?? 0).toLocaleString(), sub: 'All roles', icon: '👥', border: C.violet },
    { label: 'New This Week', value: (newFarmersRes.count ?? 0).toLocaleString(), sub: '7-day growth', icon: '🆕', border: C.greenBright },
    { label: 'Active Listings', value: (listingsRes.count ?? 0).toLocaleString(), sub: 'Currently live', icon: '📦', border: C.amber },
    {
      label: 'GMV This Month', sub: 'UGX total', icon: '💰', border: C.blue,
      value: gmv > 1e6 ? `${(gmv / 1e6).toFixed(1)}M` : gmv > 0 ? Math.round(gmv).toLocaleString() : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

async function RecentUsers() {
  const supabase = await createClient();
  const { data: users } = await (supabase.from as any)('profiles')
    .select('full_name, role, location, created_at, phone_number')
    .order('created_at', { ascending: false })
    .limit(10);

  const rows = users ?? [];
  const ROLE_CFG: Record<string, { color: string; bg: string }> = {
    farmer:   { color: '#059669', bg: '#D1FAE5' },
    buyer:    { color: '#D97706', bg: '#FEF3C7' },
    supplier: { color: '#0284C7', bg: '#DBEAFE' },
    admin:    { color: C.violet, bg: '#EDE9FE' },
  };

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Sign-ups</p>
        <span className="text-xs" style={{ color: C.muted }}>{rows.length} shown</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No users yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((u: any, i: number) => {
            const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.farmer;
            return (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {(u.full_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{u.full_name ?? 'Unknown'}</p>
                    <p className="text-[11px] truncate" style={{ color: C.muted }}>{u.phone_number ?? u.location ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: cfg.bg, color: cfg.color }}>
                    {u.role}
                  </span>
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

function PlatformHealth() {
  const metrics = [
    { label: 'Auth system',      status: 'Operational', color: '#059669' },
    { label: 'Database',         status: 'Operational', color: '#059669' },
    { label: 'Notifications',    status: 'Operational', color: '#059669' },
    { label: 'File storage',     status: 'Operational', color: '#059669' },
    { label: 'Mobile Money API', status: 'Coming soon', color: C.amber   },
    { label: 'Wallet ledger',    status: 'Coming soon', color: C.amber   },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Platform Health</p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {metrics.map(({ label, status, color }) => (
          <div key={label} className="px-5 py-3 flex items-center justify-between">
            <p className="text-sm" style={{ color: C.text }}>{label}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-semibold" style={{ color }}>{status}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const TOOLS = [
    { href: '/admin/prices', emoji: '📝', title: 'Update Prices',  sub: 'Add market price data', border: C.greenBright },
    { href: '/admin/alert',  emoji: '📢', title: 'Send Alert',     sub: 'Broadcast to farmers',  border: C.blue },
    { href: '/admin/buyers', emoji: '👤', title: 'Manage Buyers',  sub: 'Review buyer accounts', border: C.amber },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Platform Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Here's what's happening on Kulima.</p>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <PlatformStats />
      </Suspense>

      {/* Admin tools */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Admin Tools</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {TOOLS.map(({ href, emoji, title, sub, border }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: C.cardBg, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, textDecoration: 'none' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: '#F0FDF4' }}>
                {emoji}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: C.text }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Users + Health */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="dash-skeleton h-64 rounded-xl" />}>
            <RecentUsers />
          </Suspense>
        </div>
        <div>
          <PlatformHealth />
        </div>
      </div>

    </div>
  );
}
