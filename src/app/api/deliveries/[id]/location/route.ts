import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

// POST — either party on this delivery (the requester or the assigned
// transporter) shares/updates their own live location. RLS enforces that a
// caller can only write a row for their own user_id, and only if they're
// actually the requester or transporter on this specific delivery — so this
// can't be used to spoof someone else's location.
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

// GET — reads the OTHER party's current shared location: the requester gets
// the driver's position, the driver gets the requester's. Which "other"
// user_id to look up depends on which side of the delivery the caller is on.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: delivery } = await (supabase.from as any)('delivery_requests')
    .select('requester_id, transporter_id')
    .eq('id', deliveryId)
    .single();
  if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

  const otherUserId = delivery.requester_id === user.id
    ? delivery.transporter_id
    : delivery.transporter_id === user.id
      ? delivery.requester_id
      : null;
  if (!otherUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data } = await (supabase.from as any)('delivery_locations')
    .select('lat, lng, updated_at')
    .eq('delivery_request_id', deliveryId)
    .eq('user_id', otherUserId)
    .maybeSingle();

  return NextResponse.json({ location: data ?? null });
}
