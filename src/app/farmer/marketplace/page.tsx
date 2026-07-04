import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf, ShieldCheck, Package } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)', greenMed: 'var(--color-primary-hover)', amber: 'var(--color-harvest)',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  active:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Active' },
  sold:    { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Sold' },
  expired: { color: 'var(--d-muted)',       bg: 'var(--color-surface-2)',  label: 'Expired' },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

async function MyListings({ profileId, filter }: { profileId: string; filter: string }) {
  const supabase = await createClient();
  let q = (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, status, created_at, notes')
    .eq('farmer_id', profileId)
    .order('created_at', { ascending: false });

  if (filter !== 'all') q = q.eq('status', filter);
  const { data: listings } = await q;
  const rows = listings ?? [];

  // Get pending offer counts per listing
  const ids = rows.map((l: any) => l.id);
  let offerMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: counts } = await (supabase.from as any)('offers')
      .select('listing_id')
      .in('listing_id', ids)
      .eq('status', 'pending');
    (counts ?? []).forEach((o: any) => {
      offerMap[o.listing_id] = (offerMap[o.listing_id] ?? 0) + 1;
    });
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Package size={48} style={{ color: C.muted }} /></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No listings yet</p>
        <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 20px' }}>Post your first produce to start receiving offers from buyers.</p>
        <Link
          href="/farmer/marketplace/new"
          style={{ display: 'inline-block', padding: '10px 24px', background: C.green, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
        >
          Post a Listing
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((l: any) => {
        const st = STATUS_CFG[l.status] ?? STATUS_CFG.active;
        const pendingOffers = offerMap[l.id] ?? 0;
        return (
          <Link
            key={l.id}
            href={`/farmer/marketplace/${l.id}`}
            style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', textDecoration: 'none', display: 'block' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-bg)' }}
                >
                  <Leaf size={20} style={{ color: getCropColor(l.crop_type) }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm capitalize" style={{ color: C.text }}>{l.crop_type}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    {pendingOffers > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>
                        {pendingOffers} offer{pendingOffers !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                    {l.quantity_kg} kg · {l.district} · {timeAgo(l.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base" style={{ color: C.green, letterSpacing: '-0.02em' }}>
                  UGX {Math.round(l.asking_price).toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: C.muted }}>per kg</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function ListingStats({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  // Fetch all listings once, derive active count + revenue in JS — avoids waterfall
  const [allListingsRes, offersRes] = await Promise.all([
    (supabase.from as any)('listings')
      .select('id, status, asking_price, quantity_kg')
      .eq('farmer_id', profileId),
    (supabase.from as any)('offers')
      .select('listing_id, status')
      .eq('status', 'pending'),
  ]);
  const allListings = allListingsRes.data ?? [];
  const myIds = new Set(allListings.map((l: any) => l.id));
  const activeCount = allListings.filter((l: any) => l.status === 'active').length;
  const revenue = allListings
    .filter((l: any) => l.status === 'sold')
    .reduce((s: number, l: any) => s + l.asking_price * l.quantity_kg, 0);
  const pendingOffers = (offersRes.data ?? []).filter((o: any) => myIds.has(o.listing_id)).length;
  const stats = [
    { label: 'Active', value: activeCount, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: 'Pending Offers', value: pendingOffers, color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
    { label: 'Revenue (sold)', value: revenue > 1e6 ? `${(revenue / 1e6).toFixed(1)}M` : revenue > 0 ? Math.round(revenue).toLocaleString() : '—', color: C.green, bg: 'var(--color-primary-bg)', prefix: 'UGX ' },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(s => (
        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px' }}>
          <p className="text-lg font-black" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.prefix}{s.value}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default async function FarmerMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/auth/signin');

  const { filter = 'active' } = await searchParams;
  const filters = ['active', 'sold', 'expired', 'all'];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            My Listings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Manage your produce offers</p>
        </div>
        <Link
          href="/farmer/marketplace/new"
          style={{ padding: '9px 18px', background: C.green, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13, flexShrink: 0 }}
        >
          + New Listing
        </Link>
      </div>

      <Suspense fallback={<div className="dash-skeleton h-16 rounded-xl" />}>
        <ListingStats profileId={(profile as any).id} />
      </Suspense>

      {/* Price protection notice */}
      <div style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-muted)', borderRadius: 12, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <ShieldCheck size={16} style={{ color: '#065F46', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
          AgriNova alerts you if any offer is more than 30% below your asking price.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {filters.map(f => (
          <a
            key={f}
            href={`/farmer/marketplace?filter=${f}`}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              textDecoration: 'none', textTransform: 'capitalize',
              background: filter === f ? C.green : 'var(--color-surface-2)',
              color: filter === f ? '#fff' : C.muted,
            }}
          >
            {f}
          </a>
        ))}
      </div>

      <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}</div>}>
        <MyListings profileId={(profile as any).id} filter={filter} />
      </Suspense>
    </div>
  );
}
