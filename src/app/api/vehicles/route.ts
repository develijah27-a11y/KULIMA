import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { plate_number, vehicle_type, capacity_kg, make_model, year, districts, is_available, is_cold_capable } = body;

  if (!plate_number || !vehicle_type || !capacity_kg) {
    return NextResponse.json({ error: 'plate_number, vehicle_type, capacity_kg required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('vehicles').insert({
    user_id:         user.id,
    plate_number,
    vehicle_type,
    capacity_kg,
    make_model:      make_model ?? null,
    year:            year ?? null,
    districts:       districts ?? null,
    is_available:    is_available ?? true,
    is_cold_capable: is_cold_capable ?? false,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, vehicleId: data.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const allowed = ['plate_number', 'vehicle_type', 'capacity_kg', 'make_model', 'year', 'districts', 'is_available', 'is_cold_capable'];
  const safe: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) { if (k in updates) safe[k] = updates[k]; }

  const { error } = await (supabase.from as any)('vehicles').update(safe).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
