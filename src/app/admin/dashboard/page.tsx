import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  );
}

function RecentSkeleton() {
  return <div className="skeleton h-48 rounded-2xl" />;
}

// ─── Streaming sections ───────────────────────────────────────────────────────

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
    (sum: number, o: any) => sum + ((o?.listing?.quantity_kg ?? 0) * (o.offered_price ?? 0)),
    0
  );

  const stats = [
    { icon: '👥', value: (farmersRes.count ?? 0).toLocaleString(), label: 'Total users', accent: 'var(--color-cream)' },
    { icon: '🆕', value: (newFarmersRes.count ?? 0).toLocaleString(), label: 'New this week', accent: 'var(--color-sprout)' },
    { icon: '📦', value: (listingsRes.count ?? 0).toLocaleString(), label: 'Active listings', accent: 'var(--color-harvest)' },
    {
      icon: '💰',
      value: gmv > 0 ? `${(gmv / 1e6).toFixed(1)}M` : '—',
      label: 'GMV this month (UGX)',
      accent: 'var(--color-harvest)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ icon, value, label, accent }) => (
        <div
          key={label}
          className="rounded-2xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-2xl">{icon}</span>
          <p className="text-3xl font-black mt-2" style={{ color: accent, letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(249,250,251,0.4)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

async function RecentUsers() {
  const supabase = await createClient();
  const { data: users } = await (supabase.from as any)('profiles')
    .select('full_name, role, location, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  const rows = users ?? [];

  const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
    farmer: { bg: 'rgba(34,197,94,0.1)', color: 'var(--color-sprout)' },
    buyer: { bg: 'rgba(245,158,11,0.1)', color: 'var(--color-harvest)' },
    supplier: { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa' },
    admin: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa' },
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
          Recent sign-ups
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(249,250,251,0.4)' }}>
          No users yet — apply the database migration to get started.
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {rows.map((u: any, i: number) => {
            const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.farmer;
            return (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: rc.bg, color: rc.color }}
                  >
                    {(u.full_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.full_name ?? 'Unknown'}</p>
                    <p className="text-[11px] truncate" style={{ color: 'rgba(249,250,251,0.4)' }}>{u.location ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{ background: rc.bg, color: rc.color }}
                  >
                    {u.role}
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(249,250,251,0.3)' }}>
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

  const TOOLS = [
    { href: '/admin/prices', emoji: '📝', title: 'Update Prices', sub: 'Add or edit market price data', accent: 'var(--color-sprout)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)' },
    { href: '/admin/alert', emoji: '📢', title: 'Send Alert', sub: 'Broadcast notifications to farmers', accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)' },
    { href: '/admin/buyers', emoji: '👤', title: 'Manage Buyers', sub: 'Review and verify buyer accounts', accent: 'var(--color-harvest)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-black" style={{ color: 'var(--color-sprout)', letterSpacing: '-0.03em' }}>Kulima</span>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}
            >
              Admin
            </span>
            <span className="text-sm" style={{ color: 'rgba(249,250,251,0.5)' }}>{adminName}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── Title ── */}
        <div>
          <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.03em' }}>Platform Overview</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(249,250,251,0.45)' }}>
            Monitor your platform health and manage the ecosystem.
          </p>
        </div>

        {/* ── Platform stats (streams in) ── */}
        <Suspense fallback={<StatsSkeleton />}>
          <PlatformStats />
        </Suspense>

        {/* ── Admin tools (instant) ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(249,250,251,0.3)' }}>
            Admin tools
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {TOOLS.map(({ href, emoji, title, sub, accent, bg, border }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-4 p-5 rounded-2xl transition-opacity hover:opacity-85"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <span className="text-2xl mt-0.5">{emoji}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: accent }}>{title}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(249,250,251,0.45)' }}>{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent users (streams in) ── */}
        <Suspense fallback={<RecentSkeleton />}>
          <RecentUsers />
        </Suspense>

      </main>
    </div>
  );
}
