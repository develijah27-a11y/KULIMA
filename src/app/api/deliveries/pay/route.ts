import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { notifyUser } from '@/lib/notify';
import { logSystemEvent } from '@/lib/system-log';

// Requester pays for the delivery — allowed from the moment a driver is
// assigned, not only after goods arrive. This is deliberate: a driver
// shouldn't have to drive to pickup on the strength of an unpaid request.
// /api/deliveries/timeout (see vercel.json cron) reminds and eventually
// auto-cancels an 'assigned' delivery that stays unpaid for too long — that
// system only makes sense if paying that early is actually possible, which
// it wasn't before this route required 'delivered'.
// Flow: deduct from requester wallet → pay driver their earnings (fare minus 10% commission) →
//       app retains commission → mark delivery paid → mark vehicle available again
//       once actually delivered (paying early doesn't free the vehicle early).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`delivery-pay:${user.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }

  const { delivery_id } = await req.json();
  if (!delivery_id) return NextResponse.json({ error: 'delivery_id required' }, { status: 400 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch the delivery — must belong to requester, be delivered, and not yet paid
  const { data: delivery, error: deliveryErr } = await (admin.from as any)('delivery_requests')
    .select('id, requester_id, transporter_id, estimated_fare, commission_amount, driver_earnings, payment_status, status, delivery_type, pickup_district, dropoff_district')
    .eq('id', delivery_id)
    .eq('requester_id', user.id)
    .single();

  if (deliveryErr || !delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (!['assigned', 'in_transit', 'delivered'].includes(delivery.status)) {
    return NextResponse.json({ error: 'This delivery has no driver assigned yet.' }, { status: 400 });
  }
  if (delivery.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 409 });

  const totalFare      = Number(delivery.estimated_fare);
  const commissionAmt  = Number(delivery.commission_amount);
  const driverEarnings = Number(delivery.driver_earnings);

  if (!totalFare || totalFare <= 0) {
    return NextResponse.json({ error: 'Invalid fare amount on delivery' }, { status: 400 });
  }

  // Fetch requester's wallet
  const { data: requesterWallet } = await (admin.from as any)('wallets')
    .select('id, balance, is_frozen')
    .eq('user_id', user.id)
    .single();

  if (!requesterWallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  if (requesterWallet.is_frozen) {
    return NextResponse.json({ error: 'This wallet has been frozen. Contact support.' }, { status: 403 });
  }
  if (Number(requesterWallet.balance) < totalFare) {
    return NextResponse.json({
      error: `Insufficient balance. Need UGX ${totalFare.toLocaleString()}, you have UGX ${Number(requesterWallet.balance).toLocaleString()}`,
    }, { status: 400 });
  }

  // Fetch driver's wallet
  const { data: driverWallet } = await (admin.from as any)('wallets')
    .select('id, balance, is_frozen')
    .eq('user_id', delivery.transporter_id)
    .single();

  if (!driverWallet) return NextResponse.json({ error: 'Driver wallet not found' }, { status: 404 });
  if (driverWallet.is_frozen) {
    return NextResponse.json({ error: "This driver's wallet has been frozen. Contact support." }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Atomic claim: claims payment_status = 'paid' (row lock, no double-pay on
  // a duplicate/concurrent request) and moves the money in the same
  // transaction — closes the race the old read-then-write Promise.all had.
  const { data: paid, error: payErr } = await (admin as any).rpc('claim_delivery_payment', {
    p_delivery_id: delivery_id,
    p_requester_user_id: user.id,
    p_driver_user_id: delivery.transporter_id,
    p_total_fare: totalFare,
    p_driver_earnings: driverEarnings,
    p_commission_amount: 0,
    p_platform_wallet_user_id: null,
  });
  if (payErr) {
    console.error('[deliveries/pay]', payErr);
    logSystemEvent({
      category: 'failed_payment',
      level: 'error',
      route: '/api/deliveries/pay',
      method: 'POST',
      userId: user.id,
      message: `Delivery payment failed: ${payErr.message}`,
      metadata: { delivery_id, totalFare },
    });
    return NextResponse.json({ error: payErr.message?.includes('Insufficient') ? payErr.message : 'Payment failed. Please try again.' }, { status: 400 });
  }
  if (!paid) {
    return NextResponse.json({ error: 'Already paid' }, { status: 409 });
  }

  // Only free the vehicle once the job itself is actually done — paying
  // early (status 'assigned'/'in_transit') must not make the driver look
  // available again while they're still out on this delivery.
  if (delivery.status === 'delivered') {
    await (admin.from as any)('vehicles').update({
      is_available: true,
      updated_at:   now,
    }).eq('user_id', delivery.transporter_id);
  }

  // Notify the driver of payment
  try {
    await notifyUser(admin, {
      userId: delivery.transporter_id,
      role:    'transporter',
      type:    'delivery',
      title:   'Payment Received',
      body:    `UGX ${driverEarnings.toLocaleString()} has been added to your wallet for the ${delivery.pickup_district} → ${delivery.dropoff_district} delivery.`,
      url:     '/transporter/wallet',
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, driverEarnings, commissionAmount: commissionAmt });
}
