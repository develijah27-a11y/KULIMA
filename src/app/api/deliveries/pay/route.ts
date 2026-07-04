import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

// Requester pays for the delivery after goods arrive.
// Flow: deduct from requester wallet → pay driver their earnings (fare minus 10% commission) →
//       app retains commission → mark delivery paid → mark vehicle available again.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (delivery.status !== 'delivered') return NextResponse.json({ error: 'Delivery not yet completed by the driver' }, { status: 400 });
  if (delivery.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 409 });

  const totalFare      = Number(delivery.estimated_fare);
  const commissionAmt  = Number(delivery.commission_amount);
  const driverEarnings = Number(delivery.driver_earnings);

  if (!totalFare || totalFare <= 0) {
    return NextResponse.json({ error: 'Invalid fare amount on delivery' }, { status: 400 });
  }

  // Fetch requester's wallet
  const { data: requesterWallet } = await (admin.from as any)('wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .single();

  if (!requesterWallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  if (Number(requesterWallet.balance) < totalFare) {
    return NextResponse.json({
      error: `Insufficient balance. Need UGX ${totalFare.toLocaleString()}, you have UGX ${Number(requesterWallet.balance).toLocaleString()}`,
    }, { status: 400 });
  }

  // Fetch driver's wallet
  const { data: driverWallet } = await (admin.from as any)('wallets')
    .select('id, balance')
    .eq('user_id', delivery.transporter_id)
    .single();

  if (!driverWallet) return NextResponse.json({ error: 'Driver wallet not found' }, { status: 404 });

  const now = new Date().toISOString();

  // Atomic payment:
  // 1. Deduct total fare from requester
  // 2. Add driver earnings to driver wallet (fare minus commission)
  // 3. Mark delivery payment_status = paid
  // 4. Free the driver's vehicle
  // 5. Log both wallet transactions
  await Promise.all([
    (admin.from as any)('wallets').update({
      balance:    Number(requesterWallet.balance) - totalFare,
      updated_at: now,
    }).eq('id', requesterWallet.id),

    (admin.from as any)('wallets').update({
      balance:    Number(driverWallet.balance) + driverEarnings,
      updated_at: now,
    }).eq('id', driverWallet.id),

    (admin.from as any)('delivery_requests').update({
      payment_status: 'paid',
      updated_at:     now,
    }).eq('id', delivery_id),

    (admin.from as any)('vehicles').update({
      is_available: true,
      updated_at:   now,
    }).eq('user_id', delivery.transporter_id),

    (admin.from as any)('wallet_transactions').insert({
      wallet_id:   requesterWallet.id,
      user_id:     user.id,
      type:        'transfer_out',
      amount:      totalFare,
      status:      'completed',
      description: `Delivery payment: ${delivery.pickup_district} → ${delivery.dropoff_district}`,
      metadata: {
        delivery_id,
        driver_earnings: driverEarnings,
        commission:      commissionAmt,
      },
    }),

    (admin.from as any)('wallet_transactions').insert({
      wallet_id:   driverWallet.id,
      user_id:     delivery.transporter_id,
      type:        'transfer_in',
      amount:      driverEarnings,
      status:      'completed',
      description: `Delivery earnings (90% after commission): ${delivery.pickup_district} → ${delivery.dropoff_district}`,
      metadata: {
        delivery_id,
        total_fare:  totalFare,
        commission:  commissionAmt,
      },
    }),
  ]);

  // Notify the driver of payment
  try {
    await (admin.from as any)('notifications').insert({
      user_id: delivery.transporter_id,
      type:    'delivery',
      title:   'Payment Received',
      body:    `UGX ${driverEarnings.toLocaleString()} has been added to your wallet for the ${delivery.pickup_district} → ${delivery.dropoff_district} delivery.`,
      read:    false,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, driverEarnings, commissionAmount: commissionAmt });
}
