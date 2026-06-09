import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ items: [] });

  const { data, error } = await (supabase.from as any)('farm_inventory')
    .select('*')
    .eq('farmer_id', profile.id)
    .order('category')
    .order('name');

  if (error) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { name, category, quantity, unit, low_stock_threshold, cost_per_unit, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await (supabase.from as any)('farm_inventory').insert({
    farmer_id: profile.id,
    name: name.trim(),
    category: category ?? 'other',
    quantity: Number(quantity) || 0,
    unit: unit ?? 'kg',
    low_stock_threshold: low_stock_threshold ? Number(low_stock_threshold) : null,
    cost_per_unit: cost_per_unit ? Number(cost_per_unit) : null,
    notes: notes?.trim() || null,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { id, name, category, quantity, unit, low_stock_threshold, cost_per_unit, notes } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farm_inventory')
    .update({
      name: name?.trim(),
      category,
      quantity: Number(quantity),
      unit,
      low_stock_threshold: low_stock_threshold ? Number(low_stock_threshold) : null,
      cost_per_unit: cost_per_unit ? Number(cost_per_unit) : null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('farmer_id', profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farm_inventory')
    .delete()
    .eq('id', id)
    .eq('farmer_id', profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
