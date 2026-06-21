import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { crop_type, total_quantity_kg, asking_price, district, notes, member_count } = body;

  if (!crop_type || !total_quantity_kg || !asking_price || !district) {
    return NextResponse.json({ error: 'crop_type, total_quantity_kg, asking_price, and district are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('group_listings').insert({
    admin_id:          user.id,
    crop_type,
    total_quantity_kg: +total_quantity_kg,
    asking_price:      +asking_price,
    district,
    notes:             notes ?? null,
    member_count:      member_count ?? 1,
    status:            'active',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const crop     = searchParams.get('crop');
  const district = searchParams.get('district');
  const id       = searchParams.get('id');

  // Single listing detail
  if (id) {
    const { data, error } = await (supabase.from as any)('group_listings')
      .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, status, created_at')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  }

  // List all active
  let query = (supabase.from as any)('group_listings')
    .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(60);

  if (crop)     query = query.eq('crop_type', crop);
  if (district) query = query.eq('district', district);

  const { data, error } = await query;
  if (error) return NextResponse.json({ data: [] });
  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
