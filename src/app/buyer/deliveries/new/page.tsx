import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { RequestDeliveryForm } from './RequestDeliveryForm';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

export default async function RequestDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ offerId?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { offerId } = await searchParams;

  // Pre-fill from an accepted offer
  let prefilledOffer: { id: string; crop_type: string; quantity_kg: number; district: string } | null = null;

  if (offerId) {
    const { data } = await (supabase.from as any)('offers')
      .select('id, listing:listings(crop_type, quantity_kg, district)')
      .eq('id', offerId)
      .eq('buyer_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (data?.listing) {
      prefilledOffer = { id: data.id, crop_type: data.listing.crop_type, quantity_kg: data.listing.quantity_kg, district: data.listing.district };
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <Link href="/buyer/offers" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← My Offers</Link>
        <h1 className="text-xl font-black mt-2" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Request Delivery
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Find a transporter for your goods</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <RequestDeliveryForm prefilledOffer={prefilledOffer} />
      </div>
    </div>
  );
}
