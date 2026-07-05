import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

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

  q = q.order('created_at', { ascending: false }).limit(60);
  const { data, error } = await q;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json(
    { success: true, data: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // Get the profiles.id (different from auth.users.id)
  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });

  const body = await req.json();
  // Accept both camelCase (farmer form) and snake_case (group create page)
  const cropType      = body.cropType      ?? body.crop_type;
  const quantityKg    = body.quantityKg    ?? body.quantity_kg;
  const askingPrice   = body.askingPrice   ?? body.asking_price;
  const availableFrom = body.availableFrom ?? body.available_from;
  const imageUrl      = body.imageUrl      ?? body.image_url;
  const { district, notes, is_group_listing } = body;

  if (!cropType || !quantityKg || !askingPrice || !district) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: 'A live photo of your produce is required' }, { status: 400 });
  }

  const insertPayload: Record<string, unknown> = {
    farmer_id:      profile.id,
    crop_type:      cropType,
    quantity_kg:    +quantityKg,
    asking_price:   +askingPrice,
    available_from: availableFrom ?? new Date().toISOString().slice(0, 10),
    district,
    notes:          notes ?? null,
    image_url:      imageUrl,
    status:         'active',
  };
  if (is_group_listing) {
    insertPayload.is_group_listing = true;
    insertPayload.group_id = user.id;
  }

  const { data, error } = await (supabase.from as any)('listings').insert(insertPayload).select().single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  revalidatePath('/farmer/dashboard');
  revalidatePath('/farmer/marketplace');
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });

  const { error } = await (supabase.from as any)('listings')
    .update({ status })
    .eq('id', id)
    .eq('farmer_id', profile.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  revalidatePath('/farmer/dashboard');
  revalidatePath('/farmer/marketplace');
  return NextResponse.json({ success: true });
}
