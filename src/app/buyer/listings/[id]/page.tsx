import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { TrustScore } from '@/components/trust/TrustScore';
import { MakeOfferForm } from './MakeOfferForm';
import { type VerificationLevel } from '@/lib/trust';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};

export default async function BuyerListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [listingRes, pricesRes, existingOfferRes] = await Promise.all([
    (supabase.from as any)('listings')
      .select('*, farmer:profiles(id, user_id, full_name, phone_number, location, verification_level, trust_score, completed_deals)')
      .eq('id', id)
      .eq('status', 'active')
      .single(),
    supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(50),
    (supabase.from as any)('offers')
      .select('id, status, offered_price, counter_price')
      .eq('listing_id', id)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'countered', 'accepted'])
      .maybeSingle(),
  ]);

  const listing = listingRes.data;
  if (!listing) notFound();

  const prices    = pricesRes.data ?? [];
  const priceMap: Record<string, number[]> = {};
  prices.forEach((p: any) => {
    if (!priceMap[p.crop_type]) priceMap[p.crop_type] = [];
    priceMap[p.crop_type].push(p.price_per_kg);
  });
  const cropPrices = priceMap[listing.crop_type] ?? [];
  const marketPrice = cropPrices.length > 0
    ? Math.round(cropPrices.reduce((a: number, b: number) => a + b, 0) / cropPrices.length)
    : null;

  const farmer = listing.farmer ?? {};
  const emoji  = CROP_EMOJI[listing.crop_type?.toLowerCase()] ?? '🌾';

  const priceDelta = marketPrice
    ? Math.round(((listing.asking_price - marketPrice) / marketPrice) * 100)
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/buyer/listings" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>
        ← Browse Listings
      </Link>

      {/* Listing header */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ background: '#F0FDF4' }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black capitalize" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {listing.crop_type}
            </h1>
            <p className="text-sm" style={{ color: C.muted }}>{listing.district} · {listing.quantity_kg} kg available</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px' }}>Asking Price</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(listing.asking_price).toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>per kg</p>
          </div>
          {marketPrice && (
            <div>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px' }}>Market Avg</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#059669', margin: 0, letterSpacing: '-0.02em' }}>
                UGX {marketPrice.toLocaleString()}
              </p>
              <p style={{ fontSize: 10, margin: '1px 0 0', fontWeight: 600, color: (priceDelta ?? 0) > 10 ? '#D97706' : '#059669' }}>
                {priceDelta !== null ? `${priceDelta >= 0 ? '+' : ''}${priceDelta}% vs avg` : ''}
              </p>
            </div>
          )}
          <div>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px' }}>Available</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
              {listing.available_from}
            </p>
          </div>
        </div>

        {listing.notes && (
          <p className="text-sm mt-4 pt-4" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
            {listing.notes}
          </p>
        )}
      </div>

      {/* Farmer profile */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Seller</p>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shrink-0"
            style={{ background: C.green }}
          >
            {farmer.full_name?.[0]?.toUpperCase() ?? 'F'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className="text-sm font-bold" style={{ color: C.text }}>{farmer.full_name ?? 'Unknown'}</p>
              {farmer.verification_level && (
                <VerificationBadge level={farmer.verification_level as VerificationLevel} size="xs" />
              )}
            </div>
            <p className="text-xs" style={{ color: C.muted }}>{farmer.phone_number ?? '—'} · {farmer.location ?? '—'}</p>
          </div>
          <TrustScore score={farmer.trust_score ?? 50} deals={farmer.completed_deals ?? 0} size="sm" />
        </div>
      </div>

      {/* Offer form */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <p className="text-sm font-bold mb-4" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {existingOfferRes.data ? 'Your Offer' : 'Make an Offer'}
        </p>
        <MakeOfferForm
          listingId={id}
          askingPrice={listing.asking_price}
          marketPrice={marketPrice}
          existingOffer={existingOfferRes.data ?? null}
        />
      </div>
    </div>
  );
}
