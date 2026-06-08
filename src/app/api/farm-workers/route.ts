import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get('farm_id');
  const activeOnly = searchParams.get('active') !== 'false';

  let q = (supabase.from as any)('farm_workers')
    .select('*, farms(name)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (farmId) q = q.eq('farm_id', farmId);
  if (activeOnly) q = q.eq('is_active', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workers: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, phone, role, farm_id, tasks, wage_ugx, wage_period, start_date, notes } = body;

  if (!name?.trim() || !role) {
    return NextResponse.json({ error: 'name and role are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('farm_workers').insert({
    owner_id:    user.id,
    farm_id:     farm_id || null,
    name:        name.trim(),
    phone:       phone?.trim() || null,
    role,
    tasks:       Array.isArray(tasks) ? tasks : [],
    wage_ugx:    wage_ugx ? Number(wage_ugx) : null,
    wage_period: wage_period || 'daily',
    start_date:  start_date || new Date().toISOString().split('T')[0],
    notes:       notes?.trim() || null,
  }).select('*, farms(name)').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, worker: data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const allowed = ['name', 'phone', 'role', 'farm_id', 'tasks', 'wage_ugx', 'wage_period', 'start_date', 'notes', 'is_active'];
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await (supabase.from as any)('farm_workers')
    .update(update)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('*, farms(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, worker: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farm_workers')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
