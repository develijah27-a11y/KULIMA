import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf, MessageSquare } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG = {
  pending:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Pending Review' },
  countered: { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Farmer Countered' },
  accepted:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Accepted' },
  rejected:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Rejected' },
  completed: { color: 'var(--color-purple)', bg: 'var(--color-purple-bg)', label: 'Completed' },
} as const;


function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

async function OffersContent({ tab, userId }: { tab: string; userId: string }) {
  const supabase = await createClient();

  let q = (supabase.from as any)('offers')
    .select('id, offered_price, counter_price, status, message, farmer_note, created_at, listing_id, listing:listings(id, crop_type, quantity_kg, asking_price, district, farmer_id)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (tab === 'active') q = q.in('status', ['pending', 'countered']);
  else if (tab !== 'all') q = q.eq('status', tab);

  const { data: offers } = await q;
  const rows = offers ?? [];

  // Get farmer names for listings
  const farmerIds = [...new Set(rows.map((o: any) => o.listing?.farmer_id).filter(Boolean))] as string[];
  const farmerMap: Record<string, string> = {};
  if (farmerIds.length > 0) {
    const { data: farmers } = await (supabase.from as any)('profiles').select('id, full_name').in('id', farmerIds);
    (farmers ?? []).forEach((f: any) => { farmerMap[f.id] = f.full_name; });
  }

  const stats = {
    active:   rows.filter((o: any) => ['pending','countered'].includes(o.status)).length,
    accepted: rows.filter((o: any) => o.status === 'accepted').length,
  };

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <div style={{ background: 'var(--color-harvest-bg)', borderRadius: 12, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--color-harvest)', letterSpacing: '-0.03em' }}>{stats.active}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-harvest)' }}>Active Negotiations</p>
        </div>
        <div style={{ background: 'var(--color-success-bg)', borderRadius: 12, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--color-success)', letterSpacing: '-0.03em' }}>{stats.accepted}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-success)' }}>Accepted Deals</p>
        </div>
      </div>

      {/* Offers list */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><MessageSquare size={40} style={{ color: C.muted }} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No offers here</p>
          <Link href="/buyer/listings" style={{ display: 'inline-block', marginTop: 12, color: C.greenMed, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Browse listings →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((offer: any) => {
              const listing = offer.listing ?? {};
              const st = STATUS_CFG[offer.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
              const farmerName = farmerMap[listing.farmer_id] ?? 'Farmer';

              return (
                <div key={offer.id} style={{ padding: '16px 20px' }}>
                  <div className="flex items-start gap-3">
                    <Leaf size={24} style={{ color: getCropColor(listing.crop_type), flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-bold capitalize" style={{ color: C.text }}>{listing.crop_type ?? '—'}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: C.muted }}>
                        {farmerName} · {listing.district ?? '—'} · {listing.quantity_kg} kg · {timeAgo(offer.created_at)}
                      </p>

                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div>
                          <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Your Offer</p>
                          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>
                            UGX {Math.round(offer.offered_price).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Asked</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.muted, margin: 0 }}>
                            UGX {Math.round(listing.asking_price ?? 0).toLocaleString()}
                          </p>
                        </div>
                        {offer.counter_price && (
                          <div>
                            <p style={{ fontSize: 9, color: 'var(--color-sky)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Counter</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-sky)', margin: 0, letterSpacing: '-0.01em' }}>
                              UGX {Math.round(offer.counter_price).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {offer.farmer_note && (
                        <p className="text-xs mt-1.5 italic" style={{ color: C.muted }}>"{offer.farmer_note}"</p>
                      )}

                      {offer.status === 'countered' && offer.counter_price && (
                        <div style={{ marginTop: 10 }}>
                          <Link
                            href={`/buyer/listings/${listing.id}`}
                            style={{ display: 'inline-block', padding: '7px 14px', background: 'var(--color-sky-bg)', color: 'var(--color-sky)', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                          >
                            Review Counter Offer →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OffersSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="dash-skeleton h-[70px] rounded-xl" />
        <div className="dash-skeleton h-[70px] rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

export default async function BuyerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { tab = 'active' } = await searchParams;
  const tabs = ['active', 'accepted', 'rejected', 'all'];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          My Offers
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Track your negotiations with farmers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map(t => (
          <a
            key={t}
            href={`/buyer/offers?tab=${t}`}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              textDecoration: 'none', textTransform: 'capitalize',
              background: tab === t ? C.green : 'var(--color-surface-2)',
              color: tab === t ? '#fff' : C.muted,
            }}
          >
            {t}
          </a>
        ))}
      </div>

      <Suspense key={tab} fallback={<OffersSkeleton />}>
        <OffersContent tab={tab} userId={user.id} />
      </Suspense>
    </div>
  );
}
