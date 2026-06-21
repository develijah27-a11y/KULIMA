import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupListingOrderForm } from './GroupListingOrderForm';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};

export default async function GroupListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [listingRes, pricesRes, existingOrderRes] = await Promise.all([
    (supabase.from as any)('group_listings')
      .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, status, created_at')
      .eq('id', id)
      .single(),
    supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(50),
    (supabase.from as any)('orders')
      .select('id, status')
      .eq('group_listing_id', id)
      .eq('buyer_id', user.id)
      .in('status', ['pending','confirmed','dispatched','in_transit','delivered'])
      .maybeSingle(),
  ]);

  const listing = listingRes.data;
  if (!listing || listing.status !== 'active') redirect('/buyer/group-listings');

  const prices = pricesRes.data ?? [];
  const priceMap: Record<string, number> = {};
  prices.forEach((p: any) => { if (!priceMap[p.crop_type]) priceMap[p.crop_type] = p.price_per_kg; });

  const market     = priceMap[listing.crop_type?.toLowerCase()];
  const priceDelta = market ? Math.round(((listing.asking_price - market) / market) * 100) : null;
  const totalValue = Math.round((listing.total_quantity_kg ?? 0) * (listing.asking_price ?? 0));
  const emoji      = CROP_EMOJI[listing.crop_type?.toLowerCase()] ?? '🌾';
  const hasOrder   = !!existingOrderRes.data;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <a href="/buyer/group-listings" style={{ fontSize: 13, color: C.muted, fontWeight: 600, textDecoration: 'none' }}>← Group Listings</a>

      {/* Hero card */}
      <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', background: 'var(--color-primary-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              {emoji}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>{listing.crop_type}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: C.green, color: '#fff' }}>GROUP LOT</span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>
                {listing.district} · {listing.member_count} contributing farmer{listing.member_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: `1px solid ${C.border}` }}>
          {[
            { label: 'Available', value: `${(listing.total_quantity_kg ?? 0).toLocaleString()} kg` },
            { label: 'Price / kg', value: `UGX ${Math.round(listing.asking_price ?? 0).toLocaleString()}` },
            { label: 'Total Value', value: `UGX ${totalValue.toLocaleString()}` },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding: '16px 20px', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Market comparison */}
        {priceDelta !== null && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>{Math.abs(priceDelta) <= 10 ? '📊' : priceDelta < 0 ? '🏷️' : '💰'}</span>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              <strong style={{ color: priceDelta <= 0 ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                {priceDelta >= 0 ? '+' : ''}{priceDelta}%
              </strong>
              {' '}compared to current market price of UGX {Math.round(market!).toLocaleString()}/kg
            </p>
          </div>
        )}

        {/* Notes */}
        {listing.notes && (
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--d-page)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Seller Notes</p>
            <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{listing.notes}</p>
          </div>
        )}

        {/* Group trust indicator */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡️</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', margin: '0 0 2px' }}>Escrow-protected transaction</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Payment is held in escrow and released only after delivery confirmation.</p>
          </div>
        </div>
      </div>

      {/* Order form or active order notice */}
      {hasOrder ? (
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>✅</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>Order already placed</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>You have an active order for this group listing. Track it in My Orders.</p>
          <a href="/buyer/orders" style={{ display: 'inline-block', padding: '10px 20px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            View My Orders →
          </a>
        </div>
      ) : (
        <GroupListingOrderForm
          listingId={listing.id}
          cropType={listing.crop_type}
          maxKg={listing.total_quantity_kg}
          pricePerKg={listing.asking_price}
          district={listing.district}
        />
      )}
    </div>
  );
}
