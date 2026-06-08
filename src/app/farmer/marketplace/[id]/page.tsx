import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { TrustScore } from '@/components/trust/TrustScore';
import { OfferActions } from './OfferActions';
import { type VerificationLevel } from '@/lib/trust';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
  green: '#1B4332', amber: '#F4A261',
};

const STATUS_CFG = {
  active:   { color: '#059669', bg: '#D1FAE5', label: 'Active' },
  sold:     { color: '#0284C7', bg: '#DBEAFE', label: 'Sold' },
  expired:  { color: '#6B7280', bg: '#F3F4F6', label: 'Expired' },
};
const OFFER_STATUS_CFG = {
  pending:   { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
  countered: { color: '#0284C7', bg: '#DBEAFE', label: 'Countered' },
  accepted:  { color: '#059669', bg: '#D1FAE5', label: 'Accepted' },
  rejected:  { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
  completed: { color: '#7C3AED', bg: '#EDE9FE', label: 'Completed' },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default async function FarmerListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', session.user.id).single();
  if (!profile) redirect('/auth/signin');

  const { data: listing } = await (supabase.from as any)('listings')
    .select('*')
    .eq('id', id)
    .eq('farmer_id', profile.id)
    .single();
  if (!listing) notFound();

  const { data: offers } = await (supabase.from as any)('offers')
    .select('id, offered_price, counter_price, status, message, farmer_note, buyer_id, created_at')
    .eq('listing_id', id)
    .order('created_at', { ascending: false });

  const rows = offers ?? [];

  // Fetch buyer profiles by user_id
  const buyerIds = [...new Set(rows.map((o: any) => o.buyer_id))] as string[];
  let buyerMap: Record<string, any> = {};
  if (buyerIds.length > 0) {
    const { data: buyers } = await (supabase.from as any)('profiles')
      .select('user_id, full_name, phone_number, verification_level, trust_score, completed_deals')
      .in('user_id', buyerIds);
    (buyers ?? []).forEach((b: any) => { buyerMap[b.user_id] = b; });
  }

  const status = STATUS_CFG[listing.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.active;
  const pendingCount = rows.filter((o: any) => o.status === 'pending').length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/farmer/marketplace" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>
          ← My Listings
        </Link>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: status.bg, color: status.color }}>
          {status.label}
        </span>
      </div>

      {/* Listing details */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black capitalize" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {listing.crop_type}
            </h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>{listing.district} · posted {timeAgo(listing.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>
              UGX {Math.round(listing.asking_price).toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>per kg</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          {[
            { label: 'Quantity', value: `${listing.quantity_kg} kg` },
            { label: 'Available', value: listing.available_from },
            { label: 'Offers', value: `${rows.length} (${pendingCount} pending)` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs" style={{ color: C.muted }}>{label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: C.text }}>{value}</p>
            </div>
          ))}
        </div>

        {listing.notes && (
          <p className="text-sm mt-4" style={{ color: C.muted }}>{listing.notes}</p>
        )}
      </div>

      {/* Offers */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>
          Incoming Offers ({rows.length})
        </p>
        {rows.length === 0 ? (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📭</p>
            <p style={{ color: C.muted, fontSize: 14 }}>No offers yet. Share your listing to attract buyers.</p>
          </div>
        ) : (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
            <div className="divide-y" style={{ borderColor: C.border }}>
              {rows.map((offer: any) => {
                const buyer = buyerMap[offer.buyer_id];
                const offerStatus = OFFER_STATUS_CFG[offer.status as keyof typeof OFFER_STATUS_CFG] ?? OFFER_STATUS_CFG.pending;
                const isPending = offer.status === 'pending';
                const priceDiff = Math.round(((offer.offered_price - listing.asking_price) / listing.asking_price) * 100);

                return (
                  <div key={offer.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                          style={{ background: '#F0FDF4', color: C.green }}
                        >
                          {buyer?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold" style={{ color: C.text }}>{buyer?.full_name ?? 'Unknown Buyer'}</p>
                            {buyer?.verification_level && (
                              <VerificationBadge level={buyer.verification_level as VerificationLevel} size="xs" />
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                            {buyer?.phone_number ?? '—'} · {timeAgo(offer.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black" style={{ color: isPending ? C.green : C.muted, letterSpacing: '-0.02em' }}>
                          UGX {Math.round(offer.offered_price).toLocaleString()}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: priceDiff >= 0 ? '#059669' : '#DC2626' }}>
                          {priceDiff >= 0 ? '+' : ''}{priceDiff}% vs asking
                        </p>
                      </div>
                    </div>

                    {buyer && (
                      <div className="mt-2 ml-13">
                        <TrustScore score={buyer.trust_score ?? 50} deals={buyer.completed_deals ?? 0} size="sm" />
                      </div>
                    )}

                    {offer.message && (
                      <p className="text-xs mt-2 ml-13 italic" style={{ color: C.muted }}>"{offer.message}"</p>
                    )}

                    {offer.counter_price && (
                      <div className="mt-2 ml-13 flex items-center gap-2">
                        <span style={{ fontSize: 11, background: '#DBEAFE', color: '#0284C7', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                          Your counter: UGX {Math.round(offer.counter_price).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: offerStatus.bg, color: offerStatus.color }}>
                        {offerStatus.label}
                      </span>
                    </div>

                    {isPending && (
                      <OfferActions
                        offerId={offer.id}
                        askingPrice={listing.asking_price}
                        offeredPrice={offer.offered_price}
                        onDone={() => { /* page will need refresh — handled client-side */ }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
