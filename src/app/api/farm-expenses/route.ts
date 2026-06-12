import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');
  const cropType = searchParams.get('crop');

  let q = (supabase.from as any)('farm_expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('expense_date', { ascending: false });

  if (season) q = q.eq('season', season);
  if (cropType) q = q.eq('crop_type', cropType);

  const { data, error } = await q.limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate summary
  const expenses = (data ?? []) as any[];
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount_ugx), 0);
  const byCat: Record<string, number> = {};
  expenses.forEach((e: any) => {
    byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount_ugx);
  });

  return NextResponse.json(
    { expenses, totalSpent, byCat },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { category, description, amount_ugx, quantity, unit, crop_type, season, expense_date, notes, farm_id } = body;

  if (!category || !description || !amount_ugx || Number(amount_ugx) <= 0) {
    return NextResponse.json({ error: 'category, description and amount_ugx are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('farm_expenses').insert({
    user_id: user.id,
    category,
    description,
    amount_ugx: Number(amount_ugx),
    quantity: quantity ? Number(quantity) : null,
    unit: unit || null,
    crop_type: crop_type || null,
    season: season || 'A2026',
    expense_date: expense_date || new Date().toISOString().split('T')[0],
    notes: notes || null,
    farm_id: farm_id || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, expense: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farm_expenses')
    .delete().eq('id', id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
