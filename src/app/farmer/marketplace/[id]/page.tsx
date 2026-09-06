import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { OfferManager } from './OfferManager';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';
import { Leaf } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
};

type Params = { params: Promise<{ id: string }> };

export default async function FarmerListingDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) redirect('/auth/signin');

  // Load listing — must belong to this farmer
  const { data: listing } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, status, notes, created_at')
    .eq('id', id)
    .eq('farmer_id', (profile as any).id)
    .single();

  if (!listing) notFound();

  // Load all offers on this listing
  const { data: rawOffers } = await (supabase.from as any)('offers')
    .select('id, buyer_id, offered_price, counter_price, status, message, farmer_note, created_at')
    .eq('listing_id', id)
    .order('created_at', { ascending: false });

  const offers = rawOffers ?? [];

  // Enrich with buyer names
  const buyerIds = [...new Set(offers.map((o: any) => o.buyer_id))] as string[];
  const buyerNames: Record<string, string> = {};
  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase
      .from('profiles').select('user_id, full_name').in('user_id', buyerIds);
    (buyers ?? []).forEach((b: any) => { buyerNames[b.user_id] = b.full_name; });
  }

  const enrichedOffers = offers.map((o: any) => ({ ...o, buyer_name: buyerNames[o.buyer_id] ?? 'Buyer' }));
  const pendingCount   = offers.filter((o: any) => ['pending','countered'].includes(o.status)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <Link href="/farmer/marketplace" style={{ fontSize: 13, color: C.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        ← My Listings
      </Link>

      {/* Listing summary card */}
      <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Leaf size={26} style={{ color: getCropColor(listing.crop_type) }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                {listing.crop_type}
              </h1>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: listing.status === 'active' ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
                color: listing.status === 'active' ? 'var(--color-success)' : C.muted,
              }}>
                {listing.status}
              </span>
              {pendingCount > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: C.amberBg, color: C.amber }}>
                  {pendingCount} need response
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{listing.quantity_kg} kg · {listing.district}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(listing.asking_price).toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>per kg</p>
          </div>
        </div>

        {listing.notes && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: C.greenBg, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: C.greenMed, margin: 0 }}>{listing.notes}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          {[
            { label: 'Total Offers', value: offers.length },
            { label: 'Pending',      value: pendingCount, hi: pendingCount > 0 },
            { label: 'Accepted',     value: offers.filter((o: any) => o.status === 'accepted').length },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: (s as any).hi ? C.amber : C.text, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
        Offers Received
      </h2>

      <OfferManager
        listingId={id}
        askingPrice={listing.asking_price}
        cropType={listing.crop_type}
        initialOffers={enrichedOffers}
      />
    </div>
  );
}
