import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notify';

type Params = { params: Promise<{ id: string }> };

const CANCELLABLE_STATUSES = ['open', 'assigned'];

// Requester cancels their own delivery request — allowed any time before
// the cargo is actually picked up (status 'open' or 'assigned'). Once a
// transporter has marked pickup ('in_transit'), a self-serve cancel here
// would strand them mid-route with someone else's cargo, so that and later
// stages are out of scope — those need support to sort out.
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: dr } = await (admin.from as any)('delivery_requests')
    .select('id, status, requester_id, transporter_id, cargo_type, cargo_kg, pickup_district')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  const isOwner = dr.requester_id === user.id;
  const isAdmin = (profile as any)?.role === 'admin';
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!CANCELLABLE_STATUSES.includes(dr.status)) {
    return NextResponse.json({
      error: dr.status === 'in_transit'
        ? 'This delivery is already in transit and can no longer be cancelled here — contact support.'
        : 'This delivery cannot be cancelled.',
    }, { status: 409 });
  }

  const { error } = await (admin.from as any)('delivery_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', CANCELLABLE_STATUSES);

  if (error) {
    console.error('[/api/deliveries/[id]/cancel POST]', error);
    return NextResponse.json({ error: 'Failed to cancel. Please try again.' }, { status: 500 });
  }

  await (admin.from as any)('driver_assignments')
    .update({ status: 'cancelled' })
    .eq('delivery_id', id)
    .neq('status', 'accepted');

  if (dr.transporter_id) {
    await notifyUser(admin, {
      userId: dr.transporter_id,
      role:   'transporter',
      type:   'delivery',
      title:  'Delivery cancelled',
      body:   `The ${dr.cargo_kg} kg ${dr.cargo_type ?? 'cargo'} pickup in ${dr.pickup_district} was cancelled by the requester.`,
      data:   { delivery_id: id },
      url:    '/transporter/active',
    });
  }

  return NextResponse.json({ success: true });
}
