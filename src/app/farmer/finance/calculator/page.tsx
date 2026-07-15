import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { CalculatorClient } from './CalculatorClient';

// Async server component — runs in background while shell streams to browser
async function CalculatorData() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  const supabase = await getSupabase();
  const [pricesRes, farmRes] = await Promise.all([
    (supabase.from as any)('market_prices')
      .select('crop_type, price_per_kg')
      .order('recorded_at', { ascending: false }),
    (supabase.from as any)('farms')
      .select('crop_types')
      .eq('user_id', session.user.id)
      .single(),
  ]);

  const seen = new Set<string>();
  const marketPrices: Record<string, number> = {};
  for (const row of (pricesRes.data ?? []) as any[]) {
    if (!seen.has(row.crop_type)) {
      seen.add(row.crop_type);
      marketPrices[row.crop_type] = Number(row.price_per_kg);
    }
  }

  return (
    <CalculatorClient
      marketPrices={marketPrices}
      primaryCrop={farmRes.data?.crop_types?.[0] ?? 'maize'}
    />
  );
}

// Page shell renders immediately — Suspense streams CalculatorData in behind it
export default function CalculatorPage() {
  return (
    <Suspense fallback={<CalculatorShell />}>
      <CalculatorData />
    </Suspense>
  );
}

function CalculatorShell() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div className="dash-skeleton h-7 w-56 rounded-lg" style={{ marginBottom: 6 }} />
        <div className="dash-skeleton h-4 w-80 rounded" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dash-skeleton h-44 rounded-2xl" />
          <div className="dash-skeleton h-56 rounded-2xl" />
          <div className="dash-skeleton h-48 rounded-2xl" />
          <div className="dash-skeleton h-40 rounded-2xl" />
        </div>
        <div className="dash-skeleton rounded-2xl" style={{ minHeight: 560 }} />
      </div>
    </div>
  );
}
