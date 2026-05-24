import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

function PulseSkeleton() {
  return <div className="skeleton h-36 rounded-2xl" />;
}

// ─── Streaming: Stats ─────────────────────────────────────────────────────────

async function BuyerStats({ userId }: { userId: string }) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [activeRes, pendingRes, completedRes] = await Promise.all([
    (supabase.from as any)('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'pending'),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'completed').gte('created_at', weekAgo),
  ]);

  const cards = [
    {
      icon: '🌾', value: activeRes.count ?? 0, label: 'Available listings',
      gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    },
    {
      icon: '💬', value: pendingRes.count ?? 0, label: 'Pending offers',
      gradient: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    },
    {
      icon: '✅', value: completedRes.count ?? 0, label: 'Done this week',
      gradient: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ icon, value, label, gradient }) => (
        <div key={label} className="rounded-2xl p-5 flex flex-col items-center text-center gap-1" style={{ background: gradient }}>
          <span className="text-2xl">{icon}</span>
          <p className="text-3xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-[11px] text-white/70">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Streaming: Market pulse ──────────────────────────────────────────────────

async function MarketPulse() {
  const supabase = await createClient();
  const { data: prices } = await supabase
    .from('market_prices')
    .select('crop_type, price_per_kg')
    .order('recorded_at', { ascending: false })
    .limit(30);

  const rows = prices ?? [];
  if (rows.length === 0) return null;

  const groups: Record<string, number[]> = {};
  rows.forEach((p: any) => {
    if (!groups[p.crop_type]) groups[p.crop_type] = [];
    groups[p.crop_type].push(p.price_per_kg);
  });

  const pulse = Object.entries(groups).slice(0, 4).map(([crop, priceList]) => ({
    crop,
    avg: Math.round(priceList.reduce((a, b) => a + b, 0) / priceList.length),
    high: Math.round(Math.max(...priceList)),
    low: Math.round(Math.min(...priceList)),
  }));

  if (pulse.length === 0) return null;

  const COLORS: Record<string, string> = {
    maize: '#FBBF24', beans: '#FB923C', coffee: '#A78BFA',
    rice: '#38BDF8', banana: '#FDE68A', cassava: '#10B981',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Market pulse
        </p>
      </div>
      <div className="grid grid-cols-2 gap-0 divide-x divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {pulse.map(({ crop, avg, high, low }) => {
          const color = COLORS[crop.toLowerCase()] ?? '#00C875';
          return (
            <div key={crop} className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-xs font-bold capitalize">{crop}</p>
              </div>
              <p className="text-lg font-black" style={{ color, letterSpacing: '-0.03em' }}>
                UGX {avg.toLocaleString()}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(241,245,249,0.35)' }}>
                {low.toLocaleString()} – {high.toLocaleString()} range
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streaming: Recent listings ───────────────────────────────────────────────

async function RecentListings() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  const rows = listings ?? [];

  const CROP_EMOJI: Record<string, string> = {
    maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
    cassava: '🥔', sorghum: '🌿', groundnuts: '🥜', cotton: '🌸', tomato: '🍅',
  };
  const CROP_COLOR: Record<string, string> = {
    maize: '#FBBF24', beans: '#FB923C', coffee: '#A78BFA', rice: '#38BDF8',
    banana: '#FDE68A', cassava: '#10B981', tomato: '#F87171',
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-4xl mb-3">🌾</p>
        <p className="font-semibold mb-1">No active listings yet</p>
        <p className="text-sm" style={{ color: 'rgba(241,245,249,0.4)' }}>Farmers are adding produce daily — check back soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(241,245,249,0.35)' }}>
          Fresh listings
        </p>
        <Link href="/buyer/listings" className="text-xs font-semibold" style={{ color: 'var(--color-sprout)' }}>
          Browse all →
        </Link>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {rows.map((l: any) => {
          const key = l.crop_type?.toLowerCase() ?? '';
          const color = CROP_COLOR[key] ?? '#00C875';
          return (
            <Link
              key={l.id}
              href="/buyer/listings"
              className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${color}18` }}
                >
                  {CROP_EMOJI[key] ?? '🌾'}
                </div>
                <div>
                  <p className="text-sm font-bold capitalize">{l.crop_type}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(241,245,249,0.4)' }}>
                    {l.quantity_kg} kg · {l.district}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black" style={{ color, letterSpacing: '-0.02em' }}>
                  UGX {Math.round(l.asking_price).toLocaleString()}
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(241,245,249,0.35)' }}>per kg</p>
              </div>
            </Link>
          );
        })}
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
  const firstName = name.split(' ')[0];

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

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
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: 'var(--color-sprout)', color: '#060B14' }}>K</div>
            <span className="font-black" style={{ color: 'var(--color-sprout)', letterSpacing: '-0.03em' }}>Kulima</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              Buyer
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}
            >
              {firstName[0]?.toUpperCase() ?? 'B'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* ── Greeting ── */}
        <div>
          <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.03em' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(241,245,249,0.45)' }}>
            Here's what's happening in the market today.
          </p>
        </div>

        {/* ── Stats (streams in) ── */}
        <Suspense fallback={<StatsSkeleton />}>
          <BuyerStats userId={user.id} />
        </Suspense>

        {/* ── Quick nav cards (instant) ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              href: '/buyer/listings',
              emoji: '📋',
              title: 'Browse Listings',
              sub: 'Find verified produce from farmers',
              gradient: 'linear-gradient(135deg, rgba(0,200,117,0.12), rgba(0,200,117,0.05))',
              border: 'rgba(0,200,117,0.2)',
              accent: '#00C875',
            },
            {
              href: '/buyer/offers',
              emoji: '💬',
              title: 'My Offers',
              sub: 'Track your active negotiations',
              gradient: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.05))',
              border: 'rgba(251,191,36,0.2)',
              accent: '#FBBF24',
            },
          ].map(({ href, emoji, title, sub, gradient, border, accent }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-5 rounded-2xl transition-opacity hover:opacity-85"
              style={{ background: gradient, border: `1px solid ${border}` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${accent}18` }}
              >
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: accent }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(241,245,249,0.5)' }}>{sub}</p>
              </div>
              <span className="text-lg shrink-0" style={{ color: 'rgba(241,245,249,0.3)' }}>→</span>
            </Link>
          ))}
        </div>

        {/* ── Market pulse (streams in) ── */}
        <Suspense fallback={<PulseSkeleton />}>
          <MarketPulse />
        </Suspense>

        {/* ── Fresh listings (streams in) ── */}
        <Suspense fallback={<ListingsSkeleton />}>
          <RecentListings />
        </Suspense>

      </main>
    </div>
  );
}
