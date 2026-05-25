import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB',
  cardBg: '#FFFFFF', green: '#1B4332', greenBright: '#52B788', greenMed: '#40916C',
  amber: '#F4A261', red: '#E63946', blue: '#0077B6',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location').eq('user_id', userId).single();
  return data as any;
});

async function BuyerStats({ userId }: { userId: string }) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [activeRes, pendingRes, completedRes] = await Promise.all([
    supabase.from('market_prices').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'pending'),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'completed').gte('created_at', weekAgo),
  ]);

  const stats = [
    { label: 'Active Listings', value: activeRes.count ?? 0, sub: 'Available to buy', icon: '🌾', border: C.greenBright },
    { label: 'Pending Offers', value: pendingRes.count ?? 0, sub: 'Awaiting response', icon: '💬', border: C.amber },
    { label: 'Completed', value: completedRes.count ?? 0, sub: 'Deals this week', icon: '✅', border: C.blue },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(({ label, value, sub, icon, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-3xl font-black" style={{ color: C.text, letterSpacing: '-0.04em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
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
    .limit(8);

  const rows = listings ?? [];
  const EMOJI: Record<string, string> = { maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌', cassava: '🥔', tomato: '🍅' };
  const COLORS: Record<string, string> = { maize: '#D97706', beans: '#DC2626', coffee: '#7C3AED', rice: '#0284C7', banana: '#B45309', cassava: '#059669', tomato: '#DC2626' };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fresh Listings</p>
        <Link href="/buyer/listings" className="text-xs font-semibold" style={{ color: C.greenMed }}>Browse all →</Link>
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
              <Link
                key={l.id}
                href="/buyer/listings"
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${color}18` }}>
                    {EMOJI[k] ?? '🌾'}
                  </div>
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: C.text }}>{l.crop_type}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{l.quantity_kg} kg · {l.district}</p>
                  </div>
                </div>
                <div className="text-right">
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

async function MarketPulse() {
  const supabase = await createClient();
  const { data: prices } = await supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(30);
  const rows = prices ?? [];
  if (rows.length === 0) return null;

  const groups: Record<string, number[]> = {};
  rows.forEach((p: any) => {
    if (!groups[p.crop_type]) groups[p.crop_type] = [];
    groups[p.crop_type].push(p.price_per_kg);
  });

  const pulse = Object.entries(groups).slice(0, 4).map(([crop, ps]) => ({
    crop, avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    high: Math.round(Math.max(...ps)), low: Math.round(Math.min(...ps)),
  }));

  const COLORS: Record<string, string> = { maize: '#D97706', beans: '#DC2626', coffee: '#7C3AED', rice: '#0284C7', banana: '#B45309', cassava: '#059669' };

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Market Pulse</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: C.border }}>
        {pulse.map(({ crop, avg, high, low }) => {
          const color = COLORS[crop.toLowerCase()] ?? C.greenMed;
          return (
            <div key={crop} className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-xs font-bold capitalize" style={{ color: C.text }}>{crop}</p>
              </div>
              <p className="text-lg font-black" style={{ color, letterSpacing: '-0.03em' }}>UGX {avg.toLocaleString()}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{low.toLocaleString()} – {high.toLocaleString()} range</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default async function BuyerDashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');
  const userId = session.user.id;

  const NAV_CARDS = [
    { href: '/buyer/listings', emoji: '📋', title: 'Browse Listings', sub: 'Find verified produce from farmers', border: C.greenBright },
    { href: '/buyer/offers',   emoji: '💬', title: 'My Offers',       sub: 'Track your active negotiations',   border: C.amber },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <BuyerStats userId={userId} />
      </Suspense>

      {/* Quick nav */}
      <div className="grid sm:grid-cols-2 gap-4">
        {NAV_CARDS.map(({ href, emoji, title, sub, border }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: C.cardBg, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, textDecoration: 'none' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: '#F0FDF4' }}>
              {emoji}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: C.text }}>{title}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{sub}</p>
            </div>
            <span className="ml-auto text-lg" style={{ color: C.muted }}>→</span>
          </Link>
        ))}
      </div>

      {/* Market pulse + Listings (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <MarketPulse />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <RecentListings />
        </Suspense>
      </div>

    </div>
  );
}
