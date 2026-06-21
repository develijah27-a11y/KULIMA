import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const admin = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getCommissionRate(db: ReturnType<typeof admin>) {
  const { data } = await (db.from as any)('platform_commission')
    .select('rate_percent, min_fee_ugx, max_fee_ugx, platform_wallet_user_id')
    .eq('active', true)
    .single();
  return data ?? { rate_percent: 2.5, min_fee_ugx: 500, max_fee_ugx: null, platform_wallet_user_id: null };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, offerId, orderId } = await req.json();
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const db = admin();

  // ──────────────────────────────────────────────────────────────────────────
  // FUND — buyer pays into escrow after seller marks order dispatched
  // Accepts either orderId (preferred) or offerId (legacy offer-based flow)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'fund') {
    if (!orderId && !offerId) {
      return NextResponse.json({ error: 'orderId or offerId required' }, { status: 400 });
    }

    let sellerUserId: string;
    let totalAmount: number;
    let escrowInsertData: Record<string, unknown>;

    if (orderId) {
      // Order-based escrow — buyer pays after seller dispatches
      const { data: order, error: orderErr } = await (db.from as any)('orders')
        .select('id, buyer_id, farmer_profile_id, total_amount, status, escrow_id, farmer:profiles!farmer_profile_id(user_id)')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 });
      if (order.status !== 'dispatched') {
        return NextResponse.json({ error: 'Escrow can only be funded after the seller ships the order' }, { status: 409 });
      }
      if (order.escrow_id) {
        return NextResponse.json({ error: 'Escrow already funded for this order' }, { status: 409 });
      }

      sellerUserId = order.farmer?.user_id;
      if (!sellerUserId) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

      totalAmount = Math.round(Number(order.total_amount));
      escrowInsertData = {
        order_id:       orderId,
        buyer_user_id:  user.id,
        seller_user_id: sellerUserId,
        amount:         totalAmount,
        status:         'funded',
      };
    } else {
      // Legacy offer-based escrow
      const { data: offer, error: offerErr } = await (db.from as any)('offers')
        .select('id, buyer_id, status, offered_price, counter_price, listing:listings(id, farmer_id, quantity_kg, farmer:profiles(user_id))')
        .eq('id', offerId)
        .eq('buyer_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (offerErr || !offer) return NextResponse.json({ error: 'Offer not found or not accepted' }, { status: 404 });

      const { data: existingEscrow } = await (db.from as any)('escrow_accounts')
        .select('id').eq('offer_id', offerId).maybeSingle();
      if (existingEscrow) return NextResponse.json({ error: 'Escrow already funded for this offer' }, { status: 409 });

      sellerUserId = offer.listing?.farmer?.user_id;
      if (!sellerUserId) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

      const finalPrice = offer.counter_price ?? offer.offered_price;
      totalAmount = Math.round(finalPrice * (offer.listing?.quantity_kg ?? 0));
      if (totalAmount <= 0) return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });

      escrowInsertData = {
        offer_id:       offerId,
        buyer_user_id:  user.id,
        seller_user_id: sellerUserId,
        amount:         totalAmount,
        status:         'funded',
      };
    }

    // Check buyer balance
    const { data: buyerWallet } = await (db.from as any)('wallets')
      .select('id, balance').eq('user_id', user.id).single();
    if (!buyerWallet || Number(buyerWallet.balance) < totalAmount) {
      return NextResponse.json({
        error: `Insufficient balance. Need UGX ${totalAmount.toLocaleString()}. Please top up your wallet.`,
      }, { status: 400 });
    }

    // Deduct buyer balance + create escrow + log transaction (atomic-ish)
    const [walletUpdate, escrowInsert, txnInsert] = await Promise.all([
      (db.from as any)('wallets').update({
        balance:    Number(buyerWallet.balance) - totalAmount,
        updated_at: new Date().toISOString(),
      }).eq('id', buyerWallet.id),
      (db.from as any)('escrow_accounts').insert(escrowInsertData).select('id').single(),
      (db.from as any)('wallet_transactions').insert({
        wallet_id:   buyerWallet.id,
        user_id:     user.id,
        type:        'escrow_lock',
        amount:      totalAmount,
        status:      'completed',
        order_id:    orderId ?? null,
        description: `Escrow funded for order`,
      }),
    ]);

    if (escrowInsert.error) return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 });

    // Link escrow to order + update status to 'paid'
    if (orderId) {
      await (db.from as any)('orders').update({
        escrow_id:  escrowInsert.data.id,
        status:     'paid',
        paid_at:    new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      // Notify seller
      const { data: order } = await (db.from as any)('orders')
        .select('farmer_profile_id, crop_type').eq('id', orderId).single();
      if (order) {
        await (db.from as any)('notifications').insert({
          farmer_id: order.farmer_profile_id,
          user_id:   sellerUserId,
          type:      'payment',
          title:     'Payment received — proceed to ship',
          body:      `The buyer has paid UGX ${totalAmount.toLocaleString()} into escrow. You can now dispatch the order.`,
          data:      { order_id: orderId },
        });
      }
    }

    return NextResponse.json({ success: true, escrowId: escrowInsert.data.id });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RELEASE — buyer confirms delivery; net payout to seller after commission
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'release') {
    const escrowId = offerId; // offerId param reused as escrowId in release/refund calls
    if (!escrowId) return NextResponse.json({ error: 'escrowId required' }, { status: 400 });

    const { data: escrow, error: escrowErr } = await (db.from as any)('escrow_accounts')
      .select('*').eq('id', escrowId).eq('status', 'funded').single();
    if (escrowErr || !escrow) return NextResponse.json({ error: 'Escrow not found or already processed' }, { status: 404 });

    // Only the buyer OR admin may confirm delivery
    const { data: profile } = await (db.from as any)('profiles').select('role').eq('user_id', user.id).single();
    const isAdmin = profile?.role === 'admin';
    const isBuyer = escrow.buyer_user_id === user.id;
    if (!isAdmin && !isBuyer) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Calculate commission
    const commission = await getCommissionRate(db);
    const grossAmount = Number(escrow.amount);
    let feeAmount = Math.round(grossAmount * commission.rate_percent / 100);
    if (feeAmount < commission.min_fee_ugx) feeAmount = commission.min_fee_ugx;
    if (commission.max_fee_ugx && feeAmount > commission.max_fee_ugx) feeAmount = commission.max_fee_ugx;
    const netPayout = grossAmount - feeAmount;

    const { data: sellerWallet } = await (db.from as any)('wallets')
      .select('id, balance').eq('user_id', escrow.seller_user_id).single();
    if (!sellerWallet) return NextResponse.json({ error: 'Seller wallet not found' }, { status: 404 });

    const now = new Date().toISOString();

    const ops: Promise<unknown>[] = [
      // Mark escrow released
      (db.from as any)('escrow_accounts').update({ status: 'released', released_at: now }).eq('id', escrow.id),
      // Credit seller (net of commission)
      (db.from as any)('wallets').update({
        balance:    Number(sellerWallet.balance) + netPayout,
        updated_at: now,
      }).eq('id', sellerWallet.id),
      // Log payout transaction
      (db.from as any)('wallet_transactions').insert({
        wallet_id:   sellerWallet.id,
        user_id:     escrow.seller_user_id,
        type:        'payout',
        amount:      netPayout,
        status:      'completed',
        order_id:    escrow.order_id ?? null,
        description: `Order payout (after ${commission.rate_percent}% platform fee)`,
      }),
      // Log fee transaction
      (db.from as any)('wallet_transactions').insert({
        wallet_id:   sellerWallet.id,
        user_id:     escrow.seller_user_id,
        type:        'fee',
        amount:      feeAmount,
        status:      'completed',
        order_id:    escrow.order_id ?? null,
        description: `Platform commission (${commission.rate_percent}%)`,
      }),
    ];

    // Credit platform wallet if configured
    if (commission.platform_wallet_user_id) {
      const { data: platformWallet } = await (db.from as any)('wallets')
        .select('id, balance').eq('user_id', commission.platform_wallet_user_id).single();
      if (platformWallet) {
        ops.push(
          (db.from as any)('wallets').update({
            balance:    Number(platformWallet.balance) + feeAmount,
            updated_at: now,
          }).eq('id', platformWallet.id),
          (db.from as any)('wallet_transactions').insert({
            wallet_id:   platformWallet.id,
            user_id:     commission.platform_wallet_user_id,
            type:        'fee',
            amount:      feeAmount,
            status:      'completed',
            order_id:    escrow.order_id ?? null,
            description: 'Platform commission received',
          }),
        );
      }
    }

    // Update order to completed
    if (escrow.order_id) {
      ops.push(
        (db.from as any)('orders').update({
          status:       'completed',
          completed_at: now,
          updated_at:   now,
        }).eq('id', escrow.order_id),
      );
    }

    await Promise.all(ops);

    return NextResponse.json({ success: true, payout: netPayout, fee: feeAmount });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFUND — admin reverses escrow back to buyer
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'refund') {
    const { data: profile } = await (db.from as any)('profiles').select('role').eq('user_id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const escrowId = offerId;
    if (!escrowId) return NextResponse.json({ error: 'escrowId required' }, { status: 400 });

    const { data: escrow } = await (db.from as any)('escrow_accounts')
      .select('*').eq('id', escrowId).in('status', ['funded', 'disputed']).single();
    if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });

    const { data: buyerWallet } = await (db.from as any)('wallets')
      .select('id, balance').eq('user_id', escrow.buyer_user_id).single();
    if (!buyerWallet) return NextResponse.json({ error: 'Buyer wallet not found' }, { status: 404 });

    const now = new Date().toISOString();
    const refundAmount = Number(escrow.amount);

    await Promise.all([
      (db.from as any)('escrow_accounts').update({ status: 'refunded' }).eq('id', escrow.id),
      (db.from as any)('wallets').update({
        balance:    Number(buyerWallet.balance) + refundAmount,
        updated_at: now,
      }).eq('id', buyerWallet.id),
      (db.from as any)('wallet_transactions').insert({
        wallet_id:   buyerWallet.id,
        user_id:     escrow.buyer_user_id,
        type:        'escrow_refund',
        amount:      refundAmount,
        status:      'completed',
        order_id:    escrow.order_id ?? null,
        description: 'Escrow refunded by admin',
      }),
      // Update order status
      ...(escrow.order_id ? [
        (db.from as any)('orders').update({
          status:       'cancelled',
          cancelled_at: now,
          updated_at:   now,
        }).eq('id', escrow.order_id),
      ] : []),
    ]);

    return NextResponse.json({ success: true, refunded: refundAmount });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DISPUTE — buyer raises dispute; admin must intervene before release
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'dispute') {
    const escrowId = offerId;
    if (!escrowId) return NextResponse.json({ error: 'escrowId required' }, { status: 400 });

    const { data: escrow } = await (db.from as any)('escrow_accounts')
      .select('*').eq('id', escrowId).eq('status', 'funded').single();
    if (!escrow) return NextResponse.json({ error: 'Escrow not found or cannot be disputed' }, { status: 404 });

    if (escrow.buyer_user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const now = new Date().toISOString();
    await Promise.all([
      (db.from as any)('escrow_accounts').update({ status: 'disputed' }).eq('id', escrow.id),
      ...(escrow.order_id ? [
        (db.from as any)('orders').update({
          status:      'disputed',
          disputed_at: now,
          updated_at:  now,
        }).eq('id', escrow.order_id),
      ] : []),
    ]);

    return NextResponse.json({ success: true, message: 'Dispute raised. Admin will review within 24 hours.' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
