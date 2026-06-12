import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('farms')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { farms: data },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } }
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, district, location, size_hectares, farm_type, crop_types, description, boundary } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Farm name required' }, { status: 400 });
  if (!location && !district) return NextResponse.json({ error: 'Location required' }, { status: 400 });

  const { data, error } = await (supabase.from as any)('farms').insert({
    user_id: user.id,
    name: name.trim(),
    location: location ?? district,
    district: district ?? location,
    size_hectares: size_hectares ?? null,
    farm_type: farm_type ?? null,
    crop_types: crop_types ?? null,
    description: description ?? null,
    boundary: boundary ?? null,
    is_active: true,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, farmId: data.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Farm id required' }, { status: 400 });

  const allowed = ['name', 'district', 'location', 'size_hectares', 'farm_type', 'crop_types', 'description', 'boundary', 'is_active'];
  const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  const { error } = await (supabase.from as any)('farms')
    .update(safeUpdates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
