import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CreateListingForm } from './CreateListingForm';
import { ShieldCheck } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [profileRes, pricesRes] = await Promise.all([
    supabase.from('profiles').select('location, primary_crop').eq('user_id', user.id).single(),
    supabase.from('market_prices').select('crop_type, price_per_kg').order('recorded_at', { ascending: false }).limit(30),
  ]);

  const profile = profileRes.data;
  const prices  = pricesRes.data ?? [];

  // Get latest price per crop
  const priceMap: Record<string, number> = {};
  prices.forEach((p: any) => {
    if (!priceMap[p.crop_type]) priceMap[p.crop_type] = p.price_per_kg;
  });

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
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Post a Listing
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          Your produce will be visible to all verified buyers on Kulima.
        </p>
      </div>

      {/* Price shield info */}
      <div style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-muted)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10 }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--color-success)' }} />
        <p style={{ fontSize: 13, color: 'var(--color-success)', margin: 0 }}>
          <strong>Price protection active.</strong> Buyers cannot offer below 70% of your asking price. We also alert you if your price is significantly below market.
        </p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <CreateListingForm
          marketPrice={priceMap[profile?.primary_crop ?? ''] ?? null}
          farmerDistrict={profile?.location ?? undefined}
        />
      </div>
    </div>
  );
}
