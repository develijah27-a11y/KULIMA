import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const district = searchParams.get('district') ?? '';
  const crop     = searchParams.get('crop') ?? '';

  const sinceDate = new Date(Date.now() - 7 * 86400000).toISOString();

  let priceQuery = (supabase.from as any)('market_prices')
    .select('id, crop_type, price_per_kg, market_name, district, recorded_at')
    .gte('recorded_at', sinceDate)
    .order('recorded_at', { ascending: false })
    .limit(200);

  if (district) priceQuery = priceQuery.eq('district', district);
  if (crop)     priceQuery = priceQuery.eq('crop_type', crop);

  const [pricesRes, demandRes] = await Promise.all([
    priceQuery,
    (supabase.from as any)('crop_demand_signals').select('crop_type, offer_count_30d, bids_per_listing').limit(50),
  ]);

  const prices = pricesRes.data ?? [];
  const demand = demandRes.data ?? [];

  // Build demand map
  const demandMap: Record<string, { offer_count: number; bids_per_listing: number }> = {};
  demand.forEach((d: any) => {
    demandMap[d.crop_type] = {
      offer_count: d.offer_count_30d ?? 0,
      bids_per_listing: parseFloat(d.bids_per_listing) ?? 0,
    };
  });

  // Aggregate: one entry per crop per district (latest price)
  const grouped: Record<string, Record<string, any>> = {};
  for (const p of prices) {
    const dist = p.district ?? 'National';
    const key  = `${p.crop_type}__${dist}`;
    if (!grouped[key]) {
      grouped[key] = { ...p, demand: demandMap[p.crop_type] ?? null };
    }
  }

  // Also national averages
  const nationalAvg: Record<string, number[]> = {};
  for (const p of prices) {
    if (!nationalAvg[p.crop_type]) nationalAvg[p.crop_type] = [];
    nationalAvg[p.crop_type].push(p.price_per_kg);
  }

  const averages: Record<string, number> = {};
  for (const [crop, vals] of Object.entries(nationalAvg)) {
    averages[crop] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  return NextResponse.json(
    { prices: Object.values(grouped), averages, demandSignals: demand },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json();
  const entries = Array.isArray(body) ? body : [body];

  const rows = entries.map((e: any) => ({
    crop_type:    e.crop_type,
    price_per_kg: e.price_per_kg,
    market_name:  e.market_name ?? `${e.district ?? 'Unknown'} Market`,
    district:     e.district ?? null,
    source:       'admin',
    recorded_at:  new Date().toISOString(),
  })).filter((r: any) => r.crop_type && r.price_per_kg > 0);

  if (rows.length === 0) return NextResponse.json({ error: 'No valid entries' }, { status: 400 });

  const { error } = await (supabase.from as any)('market_prices').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, inserted: rows.length });
}
