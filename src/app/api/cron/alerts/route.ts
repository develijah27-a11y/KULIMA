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
        .select('id')
        .eq('district', w.location_key)
        .eq('role', 'farmer')
        .then(({ data: farmers }) => {
          if (!farmers?.length) return;
          supabase.from('notifications').insert(
            farmers.map((f: any) => ({
              farmer_id: f.id,
              type:    'rain',
              title:   'Rain arriving in your area',
              body:    rainDays[0]?.weather?.[0]?.description ?? 'Heavy rain expected in the next few days',
              read:    false,
            }))
          );
        });
    }
  });

  // 2. Detect price changes > 10%
  const { data: prices } = await supabase
    .from('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .gte('recorded_at', new Date(Date.now() - 2 * 86400 * 1000).toISOString());

  const groups: Record<string, number[]> = {};
  (prices ?? []).forEach((p: any) => { groups[p.crop_type] = [...(groups[p.crop_type] ?? []), p.price_per_kg]; });

  Object.entries(groups).forEach(([crop, ps]) => {
    if (ps.length < 10) return;
    const half = Math.floor(ps.length / 2);
    const oldAvg = ps.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
    const newAvg = ps.slice(half).reduce((a: number, b: number) => a + b, 0) / half;
    if (Math.abs((newAvg - oldAvg) / oldAvg) > 0.10) {
      // Would notify all farmers growing this crop
    }
  });

  return NextResponse.json({ success: true });
}
