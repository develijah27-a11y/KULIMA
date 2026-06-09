import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: '#1B4332', greenMed: '#40916C',
};

const STATUS_CFG = {
  pending:   { color: '#D97706', bg: '#FEF3C7', label: 'Pending Review' },
  countered: { color: '#0284C7', bg: '#DBEAFE', label: 'Farmer Countered' },
  accepted:  { color: '#059669', bg: '#D1FAE5', label: 'Accepted' },
  rejected:  { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
  completed: { color: '#7C3AED', bg: '#EDE9FE', label: 'Completed' },
} as const;

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default async function BuyerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { tab = 'active' } = await searchParams;
  const tabs = ['active', 'accepted', 'rejected', 'all'];

  let q = (supabase.from as any)('offers')
    .select('id, offered_price, counter_price, status, message, farmer_note, created_at, listing_id, listing:listings(id, crop_type, quantity_kg, asking_price, district, farmer_id)')
    .eq('buyer_id', session.user.id)
    .order('created_at', { ascending: false });

  if (tab === 'active') q = q.in('status', ['pending', 'countered']);
  else if (tab !== 'all') q = q.eq('status', tab);

  const { data: offers } = await q;
  const rows = offers ?? [];

  // Get farmer names for listings
  const farmerIds = [...new Set(rows.map((o: any) => o.listing?.farmer_id).filter(Boolean))] as string[];
  let farmerMap: Record<string, string> = {};
  if (farmerIds.length > 0) {
    const { data: farmers } = await (supabase.from as any)('profiles').select('id, full_name').in('id', farmerIds);
    (farmers ?? []).forEach((f: any) => { farmerMap[f.id] = f.full_name; });
  }

  const stats = {
    active:   rows.filter((o: any) => ['pending','countered'].includes(o.status)).length,
    accepted: rows.filter((o: any) => o.status === 'accepted').length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Offers
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Track your negotiations with farmers</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: '#D97706', letterSpacing: '-0.03em' }}>{stats.active}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#D97706' }}>Active Negotiations</p>
        </div>
        <div style={{ background: '#D1FAE5', borderRadius: 12, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: '#059669', letterSpacing: '-0.03em' }}>{stats.accepted}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#059669' }}>Accepted Deals</p>
        </div>
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
              background: tab === t ? C.green : '#F3F4F6',
              color: tab === t ? '#fff' : C.muted,
            }}
          >
            {t}
          </a>
        ))}
      </div>

      {/* Offers list */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>💬</p>
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
              const emoji = CROP_EMOJI[listing.crop_type?.toLowerCase()] ?? '🌾';
              const farmerName = farmerMap[listing.farmer_id] ?? 'Farmer';

              return (
                <div key={offer.id} style={{ padding: '16px 20px' }}>
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{emoji}</span>
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
                            <p style={{ fontSize: 9, color: '#0284C7', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Counter</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: '#0284C7', margin: 0, letterSpacing: '-0.01em' }}>
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
                            style={{ display: 'inline-block', padding: '7px 14px', background: '#DBEAFE', color: '#0284C7', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
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
