import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');

  let q = (supabase.from as any)('farm_projections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (season) q = q.eq('season', season);

  const { data, error } = await q.limit(100);
  if (error) {
    console.error('[/api/farm-projections]', error);
    return NextResponse.json({ error: 'Failed to load projections.' }, { status: 500 });
  }
  return NextResponse.json(
    { projections: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    crop_type, area_ha, season, irrigated,
    market_price_per_kg, target_margin_pct,
    costs_json,
    projected_yield_kg, projected_revenue_ugx, projected_profit_ugx,
    suggested_price_per_kg, break_even_price_per_kg,
    farm_id,
  } = body;

  if (!crop_type || !area_ha || !market_price_per_kg) {
    return NextResponse.json({ error: 'crop_type, area_ha and market_price_per_kg are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('farm_projections').insert({
    user_id: user.id,
    farm_id: farm_id || null,
    crop_type,
    area_ha: Number(area_ha),
    season: season || 'A2026',
    irrigated: Boolean(irrigated),
    market_price_per_kg: Number(market_price_per_kg),
    target_margin_pct: Number(target_margin_pct) || 40,
    costs_json: costs_json || {},
    projected_yield_kg: projected_yield_kg ? Number(projected_yield_kg) : null,
    projected_revenue_ugx: projected_revenue_ugx ? Number(projected_revenue_ugx) : null,
    projected_profit_ugx: projected_profit_ugx ? Number(projected_profit_ugx) : null,
    suggested_price_per_kg: suggested_price_per_kg ? Number(suggested_price_per_kg) : null,
    break_even_price_per_kg: break_even_price_per_kg ? Number(break_even_price_per_kg) : null,
  }).select().single();

  if (error) {
    console.error('[/api/farm-projections]', error);
    return NextResponse.json({ error: 'Failed to save the projection.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, projection: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farm_projections')
    .delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    console.error('[/api/farm-projections]', error);
    return NextResponse.json({ error: 'Failed to delete the projection.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
