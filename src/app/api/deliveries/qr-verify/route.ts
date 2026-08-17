import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyQrToken } from '@/lib/qr-payment';
import { rateLimit } from '@/lib/rate-limit';
import { logSystemEvent } from '@/lib/system-log';

// Payer scans a delivery-payment QR. This route only ever answers "is this
// a real, live, unconsumed token for a delivery you're actually the
// requester on, and if so here's who/what it's for" — it never moves
// money itself. Consumes the token the instant it validates (per spec:
// even opening the confirm screen invalidates it), so two people scanning
// the same photographed code can't both reach a confirm screen for it.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate-limited per caller AND per IP — a tampering attempt is more likely
  // to come from someone hammering with edited payloads than a real user
  // scanning normally.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const [byUser, byIp] = await Promise.all([
    rateLimit(`qr-verify:user:${user.id}`, 15, 60),
    rateLimit(`qr-verify:ip:${ip}`, 30, 60),
  ]);
  if (!byUser || !byIp) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid QR code.' }, { status: 400 });
  }

  const payload = verifyQrToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'This code is invalid or has expired.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Atomic claim: only succeeds once, for whoever's request lands first —
  // .is('consumed_at', null) means a second scan of the same token (two
  // people, or a retry) finds nothing to update and fails cleanly here
  // rather than racing past this check.
  const { data: claimed } = await (admin.from as any)('delivery_payment_qr_tokens')
    .update({ consumed_at: new Date().toISOString(), consumed_by: user.id })
    .eq('nonce', payload.nonce)
    .eq('delivery_id', payload.deliveryId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id, payee_user_id, amount')
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json({ error: 'This code is invalid, has expired, or was already used.' }, { status: 400 });
  }

  // The token's own state (fresh, unconsumed) says nothing about whether
  // the delivery itself is still in a payable state — that can change out
  // from under a QR at any point (cancelled, disputed, paid another way),
  // so it's re-checked here against the live row, not assumed from the
  // token alone.
  const { data: delivery } = await (admin.from as any)('delivery_requests')
    .select('id, requester_id, transporter_id, status, payment_status, driver_earnings, pickup_district, dropoff_district')
    .eq('id', payload.deliveryId)
    .single();

  if (!delivery) {
    return NextResponse.json({ error: 'This delivery no longer exists.' }, { status: 404 });
  }
  if (delivery.requester_id !== user.id) {
    return NextResponse.json({ error: 'This payment code is not for one of your deliveries.' }, { status: 403 });
  }
  if (delivery.payment_status === 'paid') {
    return NextResponse.json({ error: 'This delivery has already been paid.' }, { status: 409 });
  }
  if (!['assigned', 'in_transit', 'delivered'].includes(delivery.status)) {
    return NextResponse.json({ error: 'This delivery is no longer active.' }, { status: 409 });
  }

  const { data: payeeProfile } = await (admin.from as any)('profiles')
    .select('full_name').eq('user_id', delivery.transporter_id).maybeSingle();

  logSystemEvent({
    category: 'api_request',
    level: 'info',
    route: '/api/deliveries/qr-verify',
    method: 'POST',
    userId: user.id,
    message: 'Delivery payment QR scanned and verified',
    metadata: {
      deliveryId: delivery.id,
      payeeUserId: delivery.transporter_id,
      nonce: payload.nonce,
      userAgent: req.headers.get('user-agent') ?? undefined,
      ip,
    },
  });

  return NextResponse.json({
    deliveryId: delivery.id,
    payeeName: payeeProfile?.full_name ?? 'Driver',
    amount: Number(delivery.driver_earnings ?? claimed.amount ?? 0),
    route: { pickupDistrict: delivery.pickup_district, dropoffDistrict: delivery.dropoff_district },
  });
}
