import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ListingDetail } from './ListingDetail';
import { getCropPhotoUrl, getCropGradient } from '@/lib/crop-photos';
import { FavouriteButton } from '@/components/ui/FavouriteButton';

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};
const CROP_COLOR: Record<string, string> = {
  maize: 'var(--color-harvest)', beans: 'var(--color-danger)', coffee: '#7C3AED',
  rice: 'var(--color-sky)', banana: 'var(--color-harvest)', cassava: 'var(--color-primary)',
  tomato: 'var(--color-danger)', sorghum: 'var(--color-harvest)',
  groundnuts: 'var(--color-harvest)', sweet_potatoes: 'var(--color-harvest)',
  sunflower: 'var(--color-harvest)',
};

export default async function BuyerListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [listingRes, priceRes, offerRes, orderRes] = await Promise.all([
    (supabase.from as any)('listings')
      .select(`
        id, farmer_id, crop_type, quantity_kg, asking_price, district, available_from, notes, quality_grade,
        farmer:profiles(full_name, location, verification_level, trust_score)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single(),

    supabase.from('market_prices')
      .select('price_per_kg, crop_type')
      .order('recorded_at', { ascending: false })
      .limit(50),

    (supabase.from as any)('offers')
      .select('id, offered_price, status')
      .eq('listing_id', id)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'countered'])
      .maybeSingle(),

    (supabase.from as any)('orders')
      .select('id')
      .eq('listing_id', id)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'confirmed', 'dispatched', 'in_transit'])
      .maybeSingle(),
  ]);

  if (!listingRes.data) notFound();

  const listing = listingRes.data as any;
  const k = listing.crop_type?.toLowerCase() ?? '';

  const prices = priceRes.data ?? [];
  const cropPrices = prices.filter((p: any) => p.crop_type === k).map((p: any) => p.price_per_kg);
  const marketPrice = cropPrices.length > 0
    ? Math.round(cropPrices.reduce((a: number, b: number) => a + b, 0) / cropPrices.length)
    : null;

  const farmerId: string = listing.farmer_id ?? '';
  const { data: favRow } = farmerId
    ? await (supabase.from as any)('buyer_favourites')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('farmer_id', farmerId)
        .maybeSingle()
    : { data: null };
  const isFavourited = !!favRow;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/buyer/listings"
          style={{ fontSize: 13, color: 'var(--d-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ← Browse Listings
        </Link>
      </div>

      <ListingDetail
        listing={listing}
        farmerId={farmerId}
        isFavourited={isFavourited}
        marketPrice={marketPrice}
        existingOffer={(offerRes as any).data ?? null}
        hasActiveOrder={!!(orderRes as any).data}
        gradient={getCropGradient(k)}
        photoUrl={getCropPhotoUrl(k, 600, 300)}
        cropEmoji={CROP_EMOJI[k] ?? '🌾'}
        cropColor={CROP_COLOR[k] ?? 'var(--color-primary)'}
      />
    </div>
  );
}
