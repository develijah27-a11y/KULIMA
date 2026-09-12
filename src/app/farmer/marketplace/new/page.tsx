import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CreateListingForm } from './CreateListingForm';
import { ShieldCheck } from 'lucide-react';
import { getUnifiedMarketPrices } from '@/lib/prices';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('location, primary_crop')
    .eq('user_id', user.id)
    .single();

  const unifiedPrices = await getUnifiedMarketPrices({ district: profile?.location ?? undefined });
  const priceMap: Record<string, number> = { ...unifiedPrices.averages };
  for (const p of unifiedPrices.prices) {
    const k = p.crop_type.toLowerCase();
    if (!priceMap[k]) priceMap[k] = p.price_per_kg;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/farmer/marketplace"
          style={{ color: C.muted, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
        >
          ← My Listings
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Post a Listing
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          Your produce will be visible to all verified buyers on Cropify.
        </p>
      </div>

      {/* Price shield info */}
      <div style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-muted)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10 }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--color-success)' }} />
        <p style={{ fontSize: 13, color: 'var(--color-success)', margin: 0 }}>
          <strong>Your price is final.</strong> We show you today's market rate so you can set a fair price with confidence — once posted, buyers pay exactly what you ask. No negotiating you down.
        </p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <CreateListingForm
          priceMap={priceMap}
          farmerDistrict={profile?.location ?? undefined}
        />
      </div>
    </div>
  );
}
