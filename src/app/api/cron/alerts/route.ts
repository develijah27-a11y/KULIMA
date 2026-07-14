import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel cron — every 6 hours
export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  // 1. Fetch latest weather to detect rain forecast
  const { data: cache } = await supabase.from('weather_cache').select('*').limit(10);
  (cache ?? []).forEach((w: any) => {
    const forecast = w.data?.forecast ?? [];
    const rainDays = (forecast as any[]).filter((d: any) => (d.pop ?? 0) > 0.6);
    if (rainDays.length > 0 && w.location_key) {
      // Notify all farmers in this district
      supabase.from('profiles')
        .select('user_id')
        .eq('district', w.location_key)
        .eq('role', 'farmer')
        .then(({ data: farmers }) => {
          if (!farmers?.length) return;
          supabase.from('notifications').insert(
            farmers.map((f: any) => ({
              user_id: f.user_id,
              type:    'rain',
              title:   'Rain arriving in your area',
              body:    rainDays[0]?.weather?.[0]?.description ?? 'Heavy rain expected in the next few days',
              read:    false,
            }))
          );
        });
    }
  });

  // 2. Detect price changes >= 5% and notify farmers growing that crop.
  // Compares the latest recorded price for each crop against the most
  // recent *prior* price (any earlier recorded_at, any source) — not a
  // fixed sample-count split, which needed 10+ rows per crop in a 2-day
  // window to ever fire and in practice never did.
  const { data: recentPrices } = await (supabase.from as any)('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(500);

  const byCrop: Record<string, { price_per_kg: number; recorded_at: string }[]> = {};
  (recentPrices ?? []).forEach((p: any) => { (byCrop[p.crop_type] ??= []).push(p); });

  const priceChanges: { crop: string; oldPrice: number; newPrice: number; pct: number }[] = [];
  for (const [crop, rows] of Object.entries(byCrop)) {
    if (rows.length < 2) continue;
    const [latest, prior] = rows; // already sorted desc by recorded_at
    if (!prior.price_per_kg) continue;
    const pct = (latest.price_per_kg - prior.price_per_kg) / prior.price_per_kg;
    if (Math.abs(pct) >= 0.05) {
      priceChanges.push({ crop, oldPrice: prior.price_per_kg, newPrice: latest.price_per_kg, pct });
    }
  }

  for (const change of priceChanges) {
    const { data: farmers } = await (supabase.from as any)('profiles')
      .select('user_id')
      .eq('primary_crop', change.crop)
      .eq('role', 'farmer');
    if (!farmers?.length) continue;

    const title = `${change.crop} price ${change.pct > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change.pct * 100))}%`;

    // Don't re-notify the same farmer about the same crop more than once a day.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: alreadyNotified } = await (supabase.from as any)('notifications')
      .select('user_id')
      .eq('title', title)
      .gte('created_at', dayAgo)
      .in('user_id', farmers.map((f: any) => f.user_id));
    const notifiedIds = new Set((alreadyNotified ?? []).map((n: any) => n.user_id));

    const toNotify = farmers.filter((f: any) => !notifiedIds.has(f.user_id));
    if (toNotify.length === 0) continue;

    await (supabase.from as any)('notifications').insert(
      toNotify.map((f: any) => ({
        user_id: f.user_id,
        type: 'price',
        title,
        body: `${change.crop} moved from UGX ${Math.round(change.oldPrice).toLocaleString()} to UGX ${Math.round(change.newPrice).toLocaleString()} per kg. Check the market page before you sell.`,
        read: false,
      })),
    );
  }

  return NextResponse.json({ success: true, priceChanges: priceChanges.length });
}
