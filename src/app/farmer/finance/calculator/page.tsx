import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalculatorClient } from './CalculatorClient';

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [pricesRes, farmRes] = await Promise.all([
    (supabase.from as any)('market_prices')
      .select('crop_type, price_per_kg')
      .order('recorded_at', { ascending: false }),
    (supabase.from as any)('farms')
      .select('primary_crop')
      .eq('user_id', user.id)
      .single(),
  ]);

  // Deduplicate prices: keep the latest price per crop_type
  const seen = new Set<string>();
  const marketPrices: Record<string, number> = {};
  for (const row of (pricesRes.data ?? []) as any[]) {
    if (!seen.has(row.crop_type)) {
      seen.add(row.crop_type);
      marketPrices[row.crop_type] = Number(row.price_per_kg);
    }
  }

  const primaryCrop: string = farmRes.data?.primary_crop ?? 'maize';

  return (
    <CalculatorClient
      marketPrices={marketPrices}
      primaryCrop={primaryCrop}
    />
  );
}
