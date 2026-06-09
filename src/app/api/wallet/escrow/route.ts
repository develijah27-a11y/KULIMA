import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, offerId } = await req.json();
  if (!action || !offerId) return NextResponse.json({ error: 'action and offerId required' }, { status: 400 });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (action === 'fund') {
    // Buyer locks funds into escrow after offer is accepted
    const { data: offer, error: offerErr } = await (admin.from as any)('offers')
      .select('id, buyer_id, status, offered_price, counter_price, listing:listings(id, farmer_id, quantity_kg, farmer:profiles(user_id))')
      .eq('id', offerId)
      .eq('buyer_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (offerErr || !offer) return NextResponse.json({ error: 'Offer not found or not accepted' }, { status: 404 });

    // Check no existing escrow
    const { data: existingEscrow } = await (admin.from as any)('escrow_accounts')
      .select('id')
      .eq('offer_id', offerId)
      .maybeSingle();

    if (existingEscrow) return NextResponse.json({ error: 'Escrow already funded for this offer' }, { status: 409 });

    const finalPrice  = offer.counter_price ?? offer.offered_price;
    const qty         = offer.listing?.quantity_kg ?? 0;
    const totalAmount = Math.round(finalPrice * qty);

    if (totalAmount <= 0) return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });

    // Get buyer's wallet
    const { data: buyerWallet } = await (admin.from as any)('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (!buyerWallet || buyerWallet.balance < totalAmount) {
      return NextResponse.json({ error: `Insufficient balance. Need UGX ${totalAmount.toLocaleString()}` }, { status: 400 });
    }

    const sellerUserId = offer.listing?.farmer?.user_id;
    if (!sellerUserId) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

    // Deduct buyer balance, create escrow, log transaction
    const [walletUpdate, escrowInsert, txnInsert] = await Promise.all([
      (admin.from as any)('wallets').update({
        balance: Number(buyerWallet.balance) - totalAmount,
        escrow_balance: 0, // escrow tracked in escrow_accounts, not wallet.escrow_balance for buyers
        updated_at: new Date().toISOString(),
      }).eq('id', buyerWallet.id),
      (admin.from as any)('escrow_accounts').insert({
        offer_id: offerId,
        buyer_user_id: user.id,
        seller_user_id: sellerUserId,
        amount: totalAmount,
        status: 'funded',
      }).select('id').single(),
      (admin.from as any)('wallet_transactions').insert({
        wallet_id: buyerWallet.id,
        user_id: user.id,
        type: 'escrow_lock',
        amount: totalAmount,
        status: 'completed',
        description: `Escrow funded for ${offer.listing?.crop_type ?? 'deal'}`,
      }),
    ]);

    if (escrowInsert.error) return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 });

    return NextResponse.json({ success: true, escrowId: escrowInsert.data.id });
  }

  if (action === 'release') {
    // Admin or buyer confirms delivery — release funds to seller
    const { data: escrow, error: escrowErr } = await (admin.from as any)('escrow_accounts')
      .select('*')
      .eq('id', offerId) // offerId reused as escrowId for release/refund
      .eq('status', 'funded')
      .single();

    if (escrowErr || !escrow) return NextResponse.json({ error: 'Escrow not found or already processed' }, { status: 404 });

    // Verify requester is buyer or admin
    const { data: profile } = await (admin.from as any)('profiles').select('role').eq('user_id', user.id).single();
    const isAdmin  = profile?.role === 'admin';
    const isBuyer  = escrow.buyer_user_id === user.id;
    if (!isAdmin && !isBuyer) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { data: sellerWallet } = await (admin.from as any)('wallets')
      .select('id, balance')
      .eq('user_id', escrow.seller_user_id)
      .single();

    if (!sellerWallet) return NextResponse.json({ error: 'Seller wallet not found' }, { status: 404 });

    await Promise.all([
      (admin.from as any)('escrow_accounts').update({
        status: 'released',
        released_at: new Date().toISOString(),
      }).eq('id', escrow.id),
      (admin.from as any)('wallets').update({
        balance: Number(sellerWallet.balance) + Number(escrow.amount),
        updated_at: new Date().toISOString(),
      }).eq('id', sellerWallet.id),
      (admin.from as any)('wallet_transactions').insert({
        wallet_id: sellerWallet.id,
        user_id: escrow.seller_user_id,
        type: 'escrow_release',
        amount: escrow.amount,
        status: 'completed',
        description: 'Payment received from escrow',
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  if (action === 'refund') {
    // Admin refunds buyer (e.g., farmer failed to deliver)
    const { data: profile } = await (admin.from as any)('profiles').select('role').eq('user_id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { data: escrow } = await (admin.from as any)('escrow_accounts')
      .select('*')
      .eq('id', offerId)
      .in('status', ['funded', 'disputed'])
      .single();

    if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });

    const { data: buyerWallet } = await (admin.from as any)('wallets')
      .select('id, balance')
      .eq('user_id', escrow.buyer_user_id)
      .single();

    if (!buyerWallet) return NextResponse.json({ error: 'Buyer wallet not found' }, { status: 404 });

    await Promise.all([
      (admin.from as any)('escrow_accounts').update({ status: 'refunded' }).eq('id', escrow.id),
      (admin.from as any)('wallets').update({
        balance: Number(buyerWallet.balance) + Number(escrow.amount),
        updated_at: new Date().toISOString(),
      }).eq('id', buyerWallet.id),
      (admin.from as any)('wallet_transactions').insert({
        wallet_id: buyerWallet.id,
        user_id: escrow.buyer_user_id,
        type: 'escrow_refund',
        amount: escrow.amount,
        status: 'completed',
        description: 'Escrow refunded',
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
