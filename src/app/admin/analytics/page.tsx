import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: '#1B4332', greenMed: '#40916C', greenBright: '#52B788',
  amber: '#F4A261', red: '#E63946', blue: '#0077B6', violet: '#7C3AED',
  cardShadow: 'var(--d-shadow-card)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

// 30-day user growth
async function UserGrowthChart() {
  const supabase = await createClient();
  const days: { label: string; date: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ label: d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }), date: d.toISOString().slice(0, 10) });
  }

  const { data: profiles } = await (supabase.from as any)('profiles')
    .select('created_at').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString());

  const counts: Record<string, number> = {};
  (profiles ?? []).forEach((p: any) => { const k = p.created_at?.slice(0, 10); if (k) counts[k] = (counts[k] ?? 0) + 1; });

  const data = days.map(d => ({ label: d.label, count: counts[d.date] ?? 0 }));
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>User Growth — 30 Days</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>New registrations per day</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: C.greenMed, letterSpacing: '-0.03em' }}>+{total}</p>
            <p className="text-[10px]" style={{ color: C.muted }}>this month</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-end gap-0.5 h-24">
          {data.map(({ count }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${count} users`}>
              <div
                style={{
                  width: '100%', minHeight: 2,
                  height: `${Math.round((count / max) * 88) + 2}px`,
                  background: count > 0 ? `linear-gradient(180deg, ${C.greenBright}, ${C.greenMed})` : '#F3F4F6',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: C.muted }}>{data[0].label}</span>
          <span className="text-[10px]" style={{ color: C.muted }}>{data[data.length - 1].label}</span>
        </div>
      </div>
    </Card>
  );
}

// GMV over time
async function GmvChart() {
  const supabase = await createClient();
  const weeks: { label: string; start: string; end: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 864e5);
    const start = new Date(end.getTime() - 7 * 864e5);
    weeks.push({ label: `W${8 - i}`, start: start.toISOString(), end: end.toISOString() });
  }

  const { data: offers } = await (supabase.from as any)('offers')
    .select('offered_price, created_at, listing:listings(quantity_kg)')
    .eq('status', 'completed')
    .gte('created_at', weeks[0].start);

  const gmvPerWeek = weeks.map(w => {
    const weekOffers = (offers ?? []).filter((o: any) => o.created_at >= w.start && o.created_at < w.end);
    const gmv = weekOffers.reduce((s: number, o: any) => s + ((o?.listing?.quantity_kg ?? 0) * (o.offered_price ?? 0)), 0);
    return { label: w.label, gmv };
  });

  const max = Math.max(...gmvPerWeek.map(w => w.gmv), 1);
  const totalGmv = gmvPerWeek.reduce((s, w) => s + w.gmv, 0);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>GMV — 8 Weeks</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Gross market value of completed trades</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black" style={{ color: C.blue, letterSpacing: '-0.03em' }}>
              {totalGmv >= 1e9 ? `${(totalGmv/1e9).toFixed(1)}B` : totalGmv >= 1e6 ? `${(totalGmv/1e6).toFixed(1)}M` : `${Math.round(totalGmv/1000)}K`}
            </p>
            <p className="text-[10px]" style={{ color: C.muted }}>UGX total</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-end gap-2 h-24">
          {gmvPerWeek.map(({ label, gmv }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                style={{
                  width: '100%', minHeight: 2,
                  height: `${Math.round((gmv / max) * 88) + 2}px`,
                  background: gmv > 0 ? `linear-gradient(180deg, #60A5FA, ${C.blue})` : '#F3F4F6',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <span className="text-[10px]" style={{ color: C.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Crop demand analysis
async function CropDemand() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('crop_type, quantity_kg, asking_price')
    .eq('status', 'active');

  const crops: Record<string, { count: number; totalKg: number; avgPrice: number; prices: number[] }> = {};
  (listings ?? []).forEach((l: any) => {
    const k = l.crop_type?.toLowerCase() ?? '';
    if (!crops[k]) crops[k] = { count: 0, totalKg: 0, avgPrice: 0, prices: [] };
    crops[k].count++;
    crops[k].totalKg += l.quantity_kg ?? 0;
    crops[k].prices.push(l.asking_price ?? 0);
  });
  Object.values(crops).forEach(c => { c.avgPrice = c.prices.length ? c.prices.reduce((a,b)=>a+b,0)/c.prices.length : 0; });

  const sorted = Object.entries(crops).sort((a, b) => b[1].totalKg - a[1].totalKg).slice(0, 8);
  const maxKg = sorted[0]?.[1].totalKg ?? 1;

  const EMOJI: Record<string,string> = { maize:'🌽', coffee:'☕', beans:'🫘', banana:'🍌', cassava:'🥔', tomato:'🍅', rice:'🌾', cotton:'🌾', groundnuts:'🥜', sunflower:'🌻' };

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Crop Supply Ranking</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Active listing volume by crop type</p>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center"><p className="text-sm" style={{ color: C.muted }}>No active listings yet</p></div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {sorted.map(([crop, d], i) => (
            <div key={crop}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black" style={{ color: C.muted }}>#{i+1}</span>
                  <span className="text-sm">{EMOJI[crop] ?? '🌱'}</span>
                  <span className="text-xs font-bold capitalize" style={{ color: C.text }}>{crop}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold" style={{ color: C.text }}>{(d.totalKg/1000).toFixed(1)}t</span>
                  <span className="text-[10px] ml-2" style={{ color: C.muted }}>{d.count} listings</span>
                </div>
              </div>
              <div style={{ height: 5, background: '#F3F4F6', borderRadius: 999 }}>
                <div style={{ height: 5, width: `${Math.round((d.totalKg/maxKg)*100)}%`, background: i === 0 ? `linear-gradient(90deg, ${C.greenMed}, ${C.greenBright})` : `linear-gradient(90deg, #60A5FA, #0077B6)`, borderRadius: 999 }} />
              </div>
              <p className="text-[10px] mt-0.5 text-right" style={{ color: C.muted }}>Avg UGX {Math.round(d.avgPrice).toLocaleString()}/kg</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Platform funnel
async function PlatformFunnel() {
  const supabase = await createClient();
  const [usersRes, listingsRes, offersRes, completedRes] = await Promise.all([
    (supabase.from as any)('profiles').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('listings').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('offers').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ]);

  const users = usersRes.count ?? 0;
  const sellers = listingsRes.count ?? 0;
  const offers = offersRes.count ?? 0;
  const deals = completedRes.count ?? 0;

  const funnelItems = [
    { label: 'Registered Users', count: users, pct: 100, color: C.violet },
    { label: 'Users with Listings', count: sellers, pct: users ? Math.round((sellers/users)*100) : 0, color: C.greenMed },
    { label: 'Listings with Offers', count: offers, pct: sellers ? Math.round((offers/sellers)*100) : 0, color: C.amber },
    { label: 'Completed Deals', count: deals, pct: offers ? Math.round((deals/offers)*100) : 0, color: C.blue },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Platform Funnel</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>User journey from signup to completed deal</p>
      </div>
      <div className="p-5 space-y-4">
        {funnelItems.map(({ label, count, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: C.text }}>{label}</span>
              <div>
                <span className="text-sm font-black" style={{ color }}>{count.toLocaleString()}</span>
                <span className="text-[10px] ml-1" style={{ color: C.muted }}>({pct}%)</span>
              </div>
            </div>
            <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999 }}>
              <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Top performing districts
async function TopDistricts() {
  const supabase = await createClient();
  const [listingsRes, usersRes] = await Promise.all([
    (supabase.from as any)('listings').select('district, quantity_kg, asking_price').eq('status', 'active'),
    (supabase.from as any)('profiles').select('location'),
  ]);

  const districtData: Record<string, { listings: number; volume: number; users: number }> = {};
  (listingsRes.data ?? []).forEach((l: any) => {
    if (!l.district) return;
    if (!districtData[l.district]) districtData[l.district] = { listings: 0, volume: 0, users: 0 };
    districtData[l.district].listings++;
    districtData[l.district].volume += (l.quantity_kg ?? 0) * (l.asking_price ?? 0);
  });
  (usersRes.data ?? []).forEach((u: any) => {
    if (!u.location) return;
    if (!districtData[u.location]) districtData[u.location] = { listings: 0, volume: 0, users: 0 };
    districtData[u.location].users++;
  });

  const sorted = Object.entries(districtData)
    .sort((a, b) => b[1].listings - a[1].listings)
    .slice(0, 6);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Top Districts</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>By active listings and user count</p>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center"><p className="text-sm" style={{ color: C.muted }}>No location data yet</p></div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {sorted.map(([district, d], i) => (
            <div key={district} className="px-5 py-3 flex items-center gap-3">
              <span className="text-sm font-black w-5 shrink-0" style={{ color: C.muted }}>#{i+1}</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: C.text }}>{district}</p>
                <p className="text-[10px]" style={{ color: C.muted }}>{d.users} users · {d.listings} listings</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold" style={{ color: C.greenMed }}>
                  {d.volume >= 1e9 ? `${(d.volume/1e9).toFixed(1)}B` : d.volume >= 1e6 ? `${(d.volume/1e6).toFixed(1)}M` : `${Math.round(d.volume/1000)}K`} UGX
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Platform Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Growth, revenue, and marketplace trends</p>
      </div>

      {/* Growth + GMV */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}><UserGrowthChart /></Suspense>
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}><GmvChart /></Suspense>
      </div>

      {/* Funnel + Crop demand */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-56 rounded-xl" />}><PlatformFunnel /></Suspense>
        <Suspense fallback={<div className="dash-skeleton h-56 rounded-xl" />}><CropDemand /></Suspense>
      </div>

      {/* Top districts */}
      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}><TopDistricts /></Suspense>
    </div>
  );
}
