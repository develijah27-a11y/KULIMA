import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  );
}

function TableSkeleton() {
  return <div className="skeleton h-64 rounded-2xl" />;
}

// ─── Streaming: Platform stats ────────────────────────────────────────────────

async function PlatformStats() {
  const supabase = await createClient();
  const weekAgo   = new Date(Date.now() - 7 * 864e5).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [farmersRes, newFarmersRes, listingsRes, dealsRes] = await Promise.all([
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    (supabase.from as any)('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (supabase.from as any)('offers').select('offered_price, listing:listings(quantity_kg)').eq('status', 'completed').gte('created_at', monthStart),
  ]);

  const gmv = (dealsRes.data ?? []).reduce(
    (sum: number, o: any) => sum + ((o?.listing?.quantity_kg ?? 0) * (o.offered_price ?? 0)),
    0
  );

  const cards = [
    {
      icon: '👥', value: (farmersRes.count ?? 0).toLocaleString(),
      label: 'Total users', sub: 'All roles',
      gradient: 'linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)',
    },
    {
      icon: '🆕', value: (newFarmersRes.count ?? 0).toLocaleString(),
      label: 'New this week', sub: '7-day growth',
      gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    },
    {
      icon: '📦', value: (listingsRes.count ?? 0).toLocaleString(),
      label: 'Active listings', sub: 'Currently live',
      gradient: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    },
    {
      icon: '💰',
      value: gmv > 1e6 ? `${(gmv / 1e6).toFixed(1)}M` : gmv > 0 ? Math.round(gmv).toLocaleString() : '—',
      label: 'GMV this month', sub: 'UGX total',
      gradient: 'linear-gradient(135deg, #EA580C 0%, #FB923C 100%)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon, value, label, sub, gradient }) => (
        <div key={label} className="rounded-2xl p-5" style={{ background: gradient }}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{icon}</span>
          </div>
          <p className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-sm font-bold text-white/90">{label}</p>
          <p className="text-[11px] text-white/60 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Streaming: Recent sign-ups ───────────────────────────────────────────────

async function RecentUsers() {
  const supabase = await createClient();
  const { data: users } = await (supabase.from as any)('profiles')
    .select('full_name, role, location, created_at, phone_number')
    .order('created_at', { ascending: false })
    .limit(10);

  const rows = users ?? [];

  const ROLE_CFG: Record<string, { gradient: string; label: string }> = {
    farmer:   { gradient: 'linear-gradient(135deg, #059669, #10B981)', label: 'Farmer' },
    buyer:    { gradient: 'linear-gradient(135deg, #D97706, #FBBF24)', label: 'Buyer' },
    supplier: { gradient: 'linear-gradient(135deg, #0284C7, #38BDF8)', label: 'Supplier' },
    admin:    { gradient: 'linear-gradient(135deg, #6D28D9, #A78BFA)', label: 'Admin' },
  };

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Recent sign-ups
        </p>
        <span className="text-xs font-semibold" style={{ color: 'rgba(241,245,249,0.3)' }}>
          {rows.length} shown
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold mb-1">No users yet</p>
          <p className="text-sm" style={{ color: 'rgba(241,245,249,0.4)' }}>Apply the database migration to start seeing users.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {rows.map((u: any, i: number) => {
            const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.farmer;
            const initial = (u.full_name ?? '?')[0].toUpperCase();
            return (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 text-white"
                    style={{ background: cfg.gradient }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.full_name ?? 'Unknown'}</p>
                    <p className="text-[11px] truncate" style={{ color: 'rgba(241,245,249,0.4)' }}>
                      {u.phone_number ?? u.location ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-full font-bold text-white"
                    style={{ background: cfg.gradient }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[11px] hidden sm:block" style={{ color: 'rgba(241,245,249,0.3)' }}>
                    {timeAgo(u.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Static: Activity metrics ─────────────────────────────────────────────────

function PlatformHealth() {
  const metrics = [
    { label: 'Auth system',     status: 'Operational', color: '#00C875' },
    { label: 'Database',        status: 'Operational', color: '#00C875' },
    { label: 'Notifications',   status: 'Operational', color: '#00C875' },
    { label: 'File storage',    status: 'Operational', color: '#00C875' },
    { label: 'Mobile Money API',status: 'Coming soon', color: '#FBBF24' },
    { label: 'Wallet ledger',   status: 'Coming soon', color: '#FBBF24' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Platform health
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {metrics.map(({ label, status, color }) => (
          <div key={label} className="px-5 py-3 flex items-center justify-between">
            <p className="text-sm">{label}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-semibold" style={{ color }}>{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const adminName: string = (profile as any)?.full_name ?? 'Admin';
  const firstName = adminName.split(' ')[0];

  const TOOLS = [
    {
      href: '/admin/prices', emoji: '📝', title: 'Update Prices',
      sub: 'Add market price data for crops',
      gradient: 'linear-gradient(135deg, rgba(0,200,117,0.12), rgba(0,200,117,0.05))',
      border: 'rgba(0,200,117,0.2)', accent: '#00C875',
    },
    {
      href: '/admin/alert', emoji: '📢', title: 'Send Alert',
      sub: 'Broadcast notifications to farmers',
      gradient: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.05))',
      border: 'rgba(56,189,248,0.2)', accent: '#38BDF8',
    },
    {
      href: '/admin/buyers', emoji: '👤', title: 'Manage Buyers',
      sub: 'Review and verify buyer accounts',
      gradient: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.05))',
      border: 'rgba(251,191,36,0.2)', accent: '#FBBF24',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)' }}>

      {/* ── Sticky header ── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(6,11,20,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: 'var(--color-sprout)', color: '#060B14' }}>K</div>
            <span className="font-black" style={{ color: 'var(--color-sprout)', letterSpacing: '-0.03em' }}>Kulima</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #A78BFA)' }}
            >
              Admin
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #A78BFA)' }}
            >
              {firstName[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── Title ── */}
        <div>
          <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.03em' }}>
            Platform Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(241,245,249,0.45)' }}>
            Welcome back, {firstName}. Here's what's happening on Kulima.
          </p>
        </div>

        {/* ── Stats (streams in) ── */}
        <Suspense fallback={<StatsSkeleton />}>
          <PlatformStats />
        </Suspense>

        {/* ── Admin tools (instant) ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(241,245,249,0.3)' }}>
            Admin tools
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {TOOLS.map(({ href, emoji, title, sub, gradient, border, accent }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-4 p-5 rounded-2xl transition-opacity hover:opacity-85"
                style={{ background: gradient, border: `1px solid ${border}` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${accent}20` }}
                >
                  {emoji}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: accent }}>{title}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(241,245,249,0.45)' }}>{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Two-column layout for lower sections ── */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Suspense fallback={<TableSkeleton />}>
              <RecentUsers />
            </Suspense>
          </div>
          <div>
            <PlatformHealth />
          </div>
        </div>

      </main>
    </div>
  );
}
