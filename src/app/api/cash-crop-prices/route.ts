import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region'); // uganda | east_africa | global

  let q = (supabase.from as any)('cash_crop_prices')
    .select('*')
    .eq('is_active', true)
    .order('region')
    .order('crop_key')
    .order('market_level');

  if (region) q = q.eq('region', region);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prices: data ?? [] });
}

// Admin-only: update a price row
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const allowed = ['price_ugx', 'price_usd', 'trend_pct', 'notes', 'price_source', 'is_active'];
  const update: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: user.id };
  for (const k of allowed) { if (k in body) update[k] = body[k]; }

  const { data, error } = await (supabase.from as any)('cash_crop_prices')
    .update(update).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, price: data });
}
