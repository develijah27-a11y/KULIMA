import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { signQrToken } from '@/lib/qr-payment';
import { rateLimit } from '@/lib/rate-limit';

const TTL_MS = 3 * 60 * 1000; // 3 minutes — matches the spec's 2-3min expiry

// Payee (the assigned transporter) requests a fresh QR token for their own
// delivery, once it's actually due for payment. This does NOT move money —
// it only mints a short-lived, single-use identifier a payer can scan to
// land on the right confirm screen fast. The real charge always runs
// through the existing /api/deliveries/pay, which recomputes the amount
// fresh from delivery_requests server-side.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`qr-token:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  const { data: delivery } = await (admin.from as any)('delivery_requests')
    .select('id, transporter_id, status, payment_status, driver_earnings')
    .eq('id', deliveryId)
    .single();

  if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (delivery.transporter_id !== user.id) {
    return NextResponse.json({ error: 'Only the assigned driver can generate a payment QR for this delivery.' }, { status: 403 });
  }
  if (delivery.payment_status === 'paid') {
    return NextResponse.json({ error: 'This delivery is already paid.' }, { status: 409 });
  }

  const { token, nonce, expiresAt } = signQrToken(deliveryId, TTL_MS);

  const { error: insertErr } = await (admin.from as any)('delivery_payment_qr_tokens').insert({
    delivery_id: deliveryId,
    payee_user_id: user.id,
    nonce,
    amount: Number(delivery.driver_earnings ?? 0),
    expires_at: expiresAt.toISOString(),
  });
  if (insertErr) {
    console.error('[qr-token]', insertErr);
    return NextResponse.json({ error: 'Could not generate QR code. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() });
}
