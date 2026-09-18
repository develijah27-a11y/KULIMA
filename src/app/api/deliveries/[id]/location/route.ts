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

// GET — reads live delivery locations for both parties (transporter and requester).
// The requester gets the live driver coordinates, the driver gets their own
// telemetry plus the requester's pin, enabling seamless bidirectional tracking.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: delivery } = await (supabase.from as any)('delivery_requests')
    .select('requester_id, transporter_id, status, trip_phase')
    .eq('id', deliveryId)
    .single();
  if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

  const isRequester = delivery.requester_id === user.id;
  const isTransporter = delivery.transporter_id === user.id;
  if (!isRequester && !isTransporter) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch both driver and requester locations in parallel
  const [driverLocRes, requesterLocRes] = await Promise.all([
    delivery.transporter_id
      ? (supabase.from as any)('delivery_locations')
          .select('lat, lng, updated_at')
          .eq('delivery_request_id', deliveryId)
          .eq('user_id', delivery.transporter_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    delivery.requester_id
      ? (supabase.from as any)('delivery_locations')
          .select('lat, lng, updated_at')
          .eq('delivery_request_id', deliveryId)
          .eq('user_id', delivery.requester_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const driverLocation = driverLocRes.data ?? null;
  const requesterLocation = requesterLocRes.data ?? null;
  const viewerRole = isTransporter ? 'transporter' : 'requester';

  return NextResponse.json({
    driverLocation,
    requesterLocation,
    viewerRole,
    tripPhase: delivery.trip_phase ?? null,
    deliveryStatus: delivery.status,
    // Backward compatibility:
    location: isTransporter ? (requesterLocation ?? driverLocation) : driverLocation,
  });
}
