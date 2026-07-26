import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, purchaseReceiptEmail } from '@/lib/email';
import { notifyUser } from '@/lib/notify';
import { releaseEscrowForSupplierOrder, refundEscrowForSupplierOrder } from '@/lib/supplier-orders/escrow';

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data as { id: string } | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, full_name, district, location').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { productId, quantity, notes } = await req.json();
  if (!productId || !quantity || +quantity <= 0) {
    return NextResponse.json({ error: 'productId and a valid quantity are required' }, { status: 400 });
  }

  const { data: product } = await (supabase.from as any)('supplier_products')
    .select('id, supplier_id, name, unit, price_per_unit, stock_qty, min_order_qty, is_available, is_flash_deal, flash_price_ugx, flash_ends_at')
    .eq('id', productId)
    .single();

  if (!product || !product.is_available) return NextResponse.json({ error: 'Product not available' }, { status: 404 });
  if (+quantity < product.min_order_qty) {
    return NextResponse.json({ error: `Minimum order is ${product.min_order_qty} ${product.unit}` }, { status: 400 });
  }
  if (+quantity > product.stock_qty) {
    return NextResponse.json({ error: `Only ${product.stock_qty} ${product.unit} left in stock` }, { status: 400 });
  }

  const { data: supplierProfile } = await (supabase.from as any)('profiles').select('user_id, full_name, business_name').eq('id', product.supplier_id).single();
  if (!supplierProfile?.user_id) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  // Charge the live flash price when a deal is actually active — computed
  // fresh from the DB (never trusted from the client, which doesn't send a
  // price at all), so a flash deal that just expired can't still be
  // honored by a stale page.
  const flashActive = !!product.is_flash_deal && !!product.flash_ends_at && new Date(product.flash_ends_at) > new Date();
  const unitPrice = flashActive ? Number(product.flash_price_ugx) : Number(product.price_per_unit);
  const total = +quantity * unitPrice;

  const admin = createServiceRoleClient();

  // Atomic conditional decrement (UPDATE ... WHERE stock_qty >= requested,
  // single row lock) — closes the race where two concurrent orders on the
  // same product both pass the soft check above and both get accepted
  // against stock that only exists once. Claimed BEFORE the order row
  // exists so a failed claim leaves nothing behind to clean up.
  const { data: claimed } = await (admin as any).rpc('claim_product_stock', {
    p_product_id: product.id,
    p_qty: +quantity,
  });
  if (!claimed) {
    return NextResponse.json({ error: `Only ${product.stock_qty} ${product.unit} left in stock. Please refresh and try again.` }, { status: 409 });
  }

  const { data: order, error } = await (supabase.from as any)('supplier_orders').insert({
    supplier_id:  product.supplier_id,
    buyer_id:     user.id,
    buyer_name:   (profile as any).full_name ?? null,
    product_id:   product.id,
    product_name: product.name,
    quantity:     +quantity,
    unit:         product.unit,
    unit_price:   unitPrice,
    amount:       total,
    district:     (profile as any).district ?? (profile as any).location ?? null,
    notes:        notes ?? null,
    status:       'pending',
  }).select().single();

  if (error) {
    console.error('[/api/supplier-orders POST]', error);
    await (admin as any).rpc('release_product_stock', { p_product_id: product.id, p_qty: +quantity });
    return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 });
  }

  // Pay into escrow immediately — unlike negotiated produce offers, a
  // catalogue purchase has no separate "seller confirms" step before the
  // price is known, so payment happens at checkout (same as any retail
  // buy-now flow) rather than waiting for the supplier to act first.
  const { data: escrowId, error: escrowErr } = await (admin as any).rpc('claim_escrow_fund_supplier_order', {
    p_supplier_order_id: order.id,
    p_buyer_user_id: user.id,
    p_seller_user_id: supplierProfile.user_id,
    p_amount: total,
  });
  if (escrowErr || !escrowId) {
    // Nothing succeeded from the buyer's point of view — undo both claims
    // and delete the order row rather than leaving an unpaid "pending" order
    // the supplier would otherwise see and might act on.
    await Promise.all([
      (admin as any).rpc('release_product_stock', { p_product_id: product.id, p_qty: +quantity }),
      (admin.from as any)('supplier_orders').delete().eq('id', order.id),
    ]);
    return NextResponse.json({
      error: escrowErr?.message?.includes('Insufficient') ? `Insufficient wallet balance. Need UGX ${total.toLocaleString()}. Please top up your wallet.` : 'Failed to process payment. Please try again.',
    }, { status: 400 });
  }

  await (admin.from as any)('supplier_orders').update({ escrow_id: escrowId, payment_status: 'escrowed' }).eq('id', order.id);

  await notifyUser(supabase, {
    userId: supplierProfile.user_id,
    role: 'supplier',
    type: 'order',
    title: `New input order — ${product.name}`,
    body: `${(profile as any).full_name ?? 'A farmer'} ordered ${quantity} ${product.unit} of ${product.name}.`,
    data: { supplier_order_id: (order as any).id },
    url: '/supplier/orders',
  });

  // E-receipt to the buyer — best-effort, only actually sends once
  // RESEND_API_KEY/EMAIL_FROM are configured (see lib/email.ts).
  if (user.email) {
    await sendEmail(
      user.email,
      'Your AgriNova purchase receipt',
      purchaseReceiptEmail({
        buyerName:   (profile as any).full_name ?? 'there',
        dealerName:  (supplierProfile as any)?.business_name || (supplierProfile as any)?.full_name || 'Agro Dealer',
        productName: product.name,
        quantity:    +quantity,
        unit:        product.unit,
        unitPrice:   unitPrice,
        amount:      +quantity * unitPrice,
        district:    (profile as any).district ?? (profile as any).location ?? null,
        receiptNo:   `AGN-${String((order as any).id).slice(0, 8).toUpperCase()}`,
        purchasedAt: (order as any).created_at ?? new Date().toISOString(),
      }),
    );
  }

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const role   = searchParams.get('role');

  // Farmer requests their own purchases; supplier requests their incoming orders
  let query = (supabase.from as any)('supplier_orders')
    .select('id, product_name, quantity, unit, amount, unit_price, status, notes, buyer_name, district, supplier_id, buyer_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (role === 'farmer') {
    // buyer_id is the raw auth uid (matches the supplier_orders_select RLS
    // check and the buyer_id convention used by offers/orders) — not
    // profiles.id, which this used to compare against and so could never
    // match a single row.
    query = query.eq('buyer_id', user.id);
  } else {
    query = query.eq('supplier_id', profile.id);
  }

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ orders: [] });
  return NextResponse.json(
    { orders: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  );
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  // Buyer (the group leader who requested a bulk quote) accepts or declines
  // once the supplier has named their discounted price — supplier-side
  // transitions (confirmed/delivered/cancelled on their own orders) stay
  // below, this only covers the buyer's own quoted-order response.
  if (status === 'confirmed' || status === 'cancelled') {
    const { data: buyerOwned } = await (supabase.from as any)('supplier_orders')
      .select('id, status, product_name, quantity, unit, unit_price, amount, district, supplier_id')
      .eq('id', id).eq('buyer_id', user.id).eq('status', 'quoted').maybeSingle();
    if (buyerOwned) {
      const admin = createServiceRoleClient();
      let escrowId: string | null = null;

      // Confirming a quote is the buyer's first real commitment to pay — fund
      // escrow here, before flipping status, so a failed payment leaves the
      // quote untouched instead of marking an unpaid order "confirmed."
      if (status === 'confirmed') {
        const { data: dealerProfileForPay } = await (supabase.from as any)('profiles')
          .select('user_id').eq('id', (buyerOwned as any).supplier_id).single();
        if (!dealerProfileForPay?.user_id) {
          return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }
        const { data: claimedId, error: escrowErr } = await (admin as any).rpc('claim_escrow_fund_supplier_order', {
          p_supplier_order_id: id,
          p_buyer_user_id: user.id,
          p_seller_user_id: dealerProfileForPay.user_id,
          p_amount: Number((buyerOwned as any).amount),
        });
        if (escrowErr || !claimedId) {
          return NextResponse.json({
            error: escrowErr?.message?.includes('Insufficient')
              ? `Insufficient wallet balance. Need UGX ${Number((buyerOwned as any).amount).toLocaleString()}. Please top up your wallet.`
              : (escrowErr?.message ?? 'Failed to process payment. Please try again.'),
          }, { status: 400 });
        }
        escrowId = claimedId;
      }

      const { error } = await (supabase.from as any)('supplier_orders')
        .update({
          status, updated_at: new Date().toISOString(),
          ...(escrowId ? { escrow_id: escrowId, payment_status: 'escrowed' } : {}),
        })
        .eq('id', id).eq('buyer_id', user.id).eq('status', 'quoted');
      if (error) {
        console.error('[/api/supplier-orders]', error);
        return NextResponse.json({ error: 'Failed to update order. Please try again.' }, { status: 500 });
      }

      // E-receipt on the moment the purchase is actually confirmed — a bulk
      // order isn't a real purchase until the buyer accepts the dealer's quote.
      if (status === 'confirmed' && user.email) {
        const [{ data: dealerProfile }, { data: buyerProfile }] = await Promise.all([
          (supabase.from as any)('profiles').select('full_name, business_name').eq('id', (buyerOwned as any).supplier_id).single(),
          supabase.from('profiles').select('full_name').eq('id', profile.id).single(),
        ]);
        await sendEmail(
          user.email,
          'Your AgriNova purchase receipt',
          purchaseReceiptEmail({
            buyerName:   (buyerProfile as any)?.full_name ?? 'there',
            dealerName:  (dealerProfile as any)?.business_name || (dealerProfile as any)?.full_name || 'Agro Dealer',
            productName: (buyerOwned as any).product_name,
            quantity:    Number((buyerOwned as any).quantity),
            unit:        (buyerOwned as any).unit,
            unitPrice:   Number((buyerOwned as any).unit_price),
            amount:      Number((buyerOwned as any).amount),
            district:    (buyerOwned as any).district ?? null,
            receiptNo:   `AGN-${String(id).slice(0, 8).toUpperCase()}`,
            purchasedAt: new Date().toISOString(),
          }),
        );
      }

      return NextResponse.json({ success: true });
    }
  }

  const allowed = ['confirmed', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const { data: ownOrder } = await (supabase.from as any)('supplier_orders')
    .select('id, product_id, quantity, payment_status')
    .eq('id', id).eq('supplier_id', profile.id).maybeSingle();
  if (!ownOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Delivering an order that was never actually paid for (e.g. a 'quoted'
  // bulk order the buyer never confirmed) would release money that was
  // never collected — this can only happen via a direct API call, not any
  // button in the current UI, but the server must not trust that.
  if (status === 'delivered' && ownOrder.payment_status !== 'escrowed') {
    return NextResponse.json({ error: 'This order has not been paid for yet.' }, { status: 409 });
  }

  const { error } = await (supabase.from as any)('supplier_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('supplier_id', profile.id);

  if (error) {
    console.error('[/api/supplier-orders]', error);
    return NextResponse.json({ error: 'Failed to update order status. Please try again.' }, { status: 500 });
  }

  const admin = createServiceRoleClient();

  if (status === 'delivered') {
    const result = await releaseEscrowForSupplierOrder(admin as any, id);
    if (!result.ok) {
      console.error('[/api/supplier-orders] escrow release failed:', result.error);
    }
  } else if (status === 'cancelled') {
    await refundEscrowForSupplierOrder(admin as any, id);
    if (ownOrder.product_id) {
      await (admin as any).rpc('release_product_stock', { p_product_id: ownOrder.product_id, p_qty: ownOrder.quantity });
    }
  }

  return NextResponse.json({ success: true });
}
