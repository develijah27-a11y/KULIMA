import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const crop     = searchParams.get('crop');
  const district = searchParams.get('district');
  const search   = searchParams.get('q');

  let q = (supabase.from as any)('listings')
    .select('*, farmer:profiles(id, full_name, location, verification_level, trust_score)')
    .eq('status', 'active');

  if (crop)     q = q.eq('crop_type', crop);
  if (district) q = q.eq('district', district);
  if (search)   q = q.ilike('crop_type', `%${search}%`);

  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // Get the profiles.id (different from auth.users.id)
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { cropType, quantityKg, askingPrice, availableFrom, district, notes } = body;
  if (!cropType || !quantityKg || !askingPrice || !district) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('listings').insert({
    farmer_id:      profile.id,
    crop_type:      cropType,
    quantity_kg:    +quantityKg,
    asking_price:   +askingPrice,
    available_from: availableFrom ?? new Date().toISOString().slice(0, 10),
    district,
    notes:          notes ?? null,
    status:         'active',
  }).select().single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

  const { error } = await (supabase.from as any)('listings').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
