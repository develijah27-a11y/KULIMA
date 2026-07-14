import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('offtaker_contracts')
    .select('*')
    .eq('offtaker_id', user.id)
    .order('delivery_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[/api/offtaker-contracts]', error);
    return NextResponse.json({ error: 'Failed to load contracts.' }, { status: 500 });
  }
  return NextResponse.json(
    { contracts: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { crop_type, district, quantity_kg, price_ugx, delivery_date, farmer_name, notes } = body;

  if (!crop_type || !district || !quantity_kg || !price_ugx || !delivery_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('offtaker_contracts').insert({
    offtaker_id:   user.id,
    crop_type,
    district,
    quantity_kg:   Number(quantity_kg),
    price_ugx:     Number(price_ugx),
    delivery_date,
    farmer_name:   farmer_name ?? null,
    notes:         notes ?? null,
    status:        'active',
    payment_status: 'pending',
    created_at:    new Date().toISOString(),
  }).select().single();

  if (error) {
    console.error('[/api/offtaker-contracts]', error);
    return NextResponse.json({ error: 'Failed to create the contract.' }, { status: 500 });
  }
  return NextResponse.json({ contract: data }, { status: 201 });
}
