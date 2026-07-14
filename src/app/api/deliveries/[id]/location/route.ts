import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

// POST — the delivery's requester shares/updates their live location.
// RLS also enforces that only the requester of this specific delivery can
// write here, so this can't be used to spoof someone else's location.
export async function POST(req: Request, { params }: Ctx) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lat, lng } = await req.json();
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng (numbers) are required' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const { error } = await (supabase.from as any)('delivery_locations').upsert({
    delivery_request_id: deliveryId,
    user_id: user.id,
    lat, lng,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'delivery_request_id,user_id' });

  if (error) {
    console.error('[/api/deliveries/[id]/location POST]', error);
    return NextResponse.json({ error: 'Failed to update location. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE — stop sharing (e.g. delivery completed, or user turns it off)
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await (supabase.from as any)('delivery_locations')
    .delete()
    .eq('delivery_request_id', deliveryId)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}

// GET — the assigned driver reads the requester's current shared location.
// RLS restricts this to whoever is transporter_id on the delivery.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await (supabase.from as any)('delivery_locations')
    .select('lat, lng, updated_at')
    .eq('delivery_request_id', deliveryId)
    .maybeSingle();

  return NextResponse.json({ location: data ?? null });
}
