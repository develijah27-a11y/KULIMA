import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const district = searchParams.get('district') ?? '';

  let query = (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, status, created_at')
    .eq('status', 'open')
    .order('pickup_date', { ascending: true });

  if (district) query = query.eq('pickup_district', district);

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deliveries: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { offer_id, pickup_district, pickup_location, dropoff_district, dropoff_location, cargo_kg, cargo_type, pickup_date, notes } = body;

  if (!pickup_district || !dropoff_district || !cargo_kg || !pickup_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('delivery_requests').insert({
    offer_id: offer_id ?? null,
    requester_id: session.user.id,
    pickup_district,
    pickup_location: pickup_location ?? pickup_district,
    dropoff_district,
    dropoff_location: dropoff_location ?? dropoff_district,
    cargo_kg,
    cargo_type: cargo_type ?? null,
    pickup_date,
    notes: notes ?? null,
    status: 'open',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deliveryId: data.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action, ...updates } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  if (action === 'start_transit') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'in_transit', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('transporter_id', session.user.id)
      .eq('status', 'assigned');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'complete') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('transporter_id', session.user.id)
      .eq('status', 'in_transit');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'cancel') {
    const { error } = await (supabase.from as any)('delivery_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('requester_id', session.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
