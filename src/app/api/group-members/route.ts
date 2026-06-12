import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('group_members')
    .select('*')
    .eq('admin_id', user.id)
    .order('role')
    .order('full_name')
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { members: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { full_name, phone_number, district, role, crop_type } = body;

  if (!full_name || !district) {
    return NextResponse.json({ error: 'Name and district are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('group_members').insert({
    admin_id:     user.id,
    full_name:    full_name.trim(),
    phone_number: phone_number ?? null,
    district,
    role:         role ?? 'member',
    crop_type:    crop_type ?? null,
    joined_at:    new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
