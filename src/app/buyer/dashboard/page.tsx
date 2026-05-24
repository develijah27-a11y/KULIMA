import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

// ─── Streaming sections ───────────────────────────────────────────────────────

async function BuyerStats({ userId, primaryCrop }: { userId: string; primaryCrop: string }) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [activeRes, pendingRes, completedRes] = await Promise.all([
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
      .eq('status', 'completed')
      .gte('created_at', weekAgo),
  ]);

  const stats = [
    { icon: '🌾', value: activeRes.count ?? 0, label: 'Available listings', accent: 'var(--color-sprout)' },
    { icon: '💬', value: pendingRes.count ?? 0, label: 'Pending offers', accent: 'var(--color-harvest)' },
    { icon: '✅', value: completedRes.count ?? 0, label: 'Done this week', accent: 'var(--color-sprout)' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(({ icon, value, label, accent }) => (
        <div
          key={label}
          className="rounded-2xl p-5 flex flex-col items-center text-center gap-1"
          style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-2xl">{icon}</span>
          <p className="text-3xl font-black" style={{ color: accent, letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-[11px]" style={{ color: 'rgba(249,250,251,0.4)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

async function RecentListings() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = listings ?? [];
  if (rows.length === 0) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-4xl mb-3">🌾</p>
      <p className="font-semibold mb-1">No listings yet</p>
      <p className="text-sm" style={{ color: 'rgba(249,250,251,0.4)' }}>Check back soon — farmers are adding produce daily.</p>
    </div>
  );

  const CROP_EMOJI: Record<string, string> = {
    maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
    cassava: '🥔', sorghum: '🌿', groundnuts: '🥜', cotton: '🌸', tomato: '🍅',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(249,250,251,0.35)' }}>
          Recent listings
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((l: any) => (
          <Link
            key={l.id}
            href="/buyer/listings"
            className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CROP_EMOJI[l.crop_type] ?? '🌾'}</span>
              <div>
                <p className="text-sm font-semibold capitalize">{l.crop_type}</p>
                <p className="text-[11px]" style={{ color: 'rgba(249,250,251,0.4)' }}>
                  {l.quantity_kg} kg · {l.district}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: 'var(--color-harvest)' }}>
                UGX {Math.round(l.asking_price).toLocaleString()}/kg
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(249,250,251,0.35)' }}>asking</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BuyerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('full_name, primary_crop')
    .eq('user_id', user.id)
    .single();

  const name: string = (profile as any)?.full_name ?? 'Buyer';
  const primaryCrop: string = (profile as any)?.primary_crop ?? 'maize';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-black" style={{ color: 'var(--color-sprout)', letterSpacing: '-0.03em' }}>Kulima</span>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-harvest)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              Buyer
            </span>
            <span className="text-sm" style={{ color: 'rgba(249,250,251,0.5)' }}>{name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* ── Welcome ── */}
        <div>
          <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.03em' }}>Welcome back, {name.split(' ')[0]}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(249,250,251,0.45)' }}>Here's what's happening in the market today.</p>
        </div>

        {/* ── Stats (streams in) ── */}
        <Suspense fallback={<StatsSkeleton />}>
          <BuyerStats userId={user.id} primaryCrop={primaryCrop} />
        </Suspense>

        {/* ── Quick actions (instant) ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { href: '/buyer/listings', emoji: '📋', title: 'Browse Listings', sub: 'Find produce from verified farmers', accent: 'var(--color-sprout)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)' },
            { href: '/buyer/offers', emoji: '💬', title: 'My Offers', sub: 'Track all your active negotiations', accent: 'var(--color-harvest)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
          ].map(({ href, emoji, title, sub, accent, bg, border }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-5 rounded-2xl transition-opacity hover:opacity-85"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-bold" style={{ color: accent }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(249,250,251,0.5)' }}>{sub}</p>
              </div>
              <span className="ml-auto text-lg" style={{ color: 'rgba(249,250,251,0.3)' }}>→</span>
            </Link>
          ))}
        </div>

        {/* ── Recent listings (streams in) ── */}
        <Suspense fallback={<ListingsSkeleton />}>
          <RecentListings />
        </Suspense>

      </main>
    </div>
  );
}
