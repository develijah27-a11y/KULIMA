import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getPosActor, hasPermission } from '@/lib/pos/getPosActor';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

interface CheckoutItem {
  productId: string | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPriceUgx: number;
}

// POST /api/pos/checkout — records an in-person sale. Stock claims, the
// sale/item rows, and the supplier wallet credit all happen inside one
// Postgres transaction (create_pos_sale) so a checkout can never partially
// succeed (e.g. claim stock for 2 of 3 items then fail on the 3rd).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();
  const actor = await getPosActor(admin, user.id);
  if (!actor) return NextResponse.json({ error: 'Only suppliers and store staff can use the POS till' }, { status: 403 });
  if (!hasPermission(actor, 'checkout')) return NextResponse.json({ error: 'You do not have permission to check out sales' }, { status: 403 });

  const body = await req.json();
  const items: CheckoutItem[] = Array.isArray(body.items) ? body.items : [];
  const paymentMethod: string = body.paymentMethod ?? 'cash';
  const customerName: string | null = body.customerName ?? null;
  const customerPhone: string | null = body.customerPhone ?? null;
  const discountUgx: number = Number(body.discountUgx ?? 0);

  if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  if (discountUgx > 0 && !hasPermission(actor, 'discount')) {
    return NextResponse.json({ error: 'You do not have permission to apply discounts' }, { status: 403 });
  }
  if (!['cash', 'wallet', 'mobile_money'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  }
  for (const item of items) {
    if (!item.productName || !(Number(item.quantity) > 0) || !(Number(item.unitPriceUgx) >= 0)) {
      return NextResponse.json({ error: 'Every item needs a name, quantity, and price' }, { status: 400 });
    }
  }

  // The wallet credited by create_pos_sale is always the STORE OWNER's,
  // regardless of who rang up the sale — resolve the owner's auth uid
  // (not their profiles.id, which is what PosActor.ownerId holds) for the
  // RPC's p_supplier_user_id parameter.
  const { data: ownerProfile } = await (admin.from as any)('profiles')
    .select('user_id, role, roles, subscription_tier, role_subscription_tiers').eq('id', actor.ownerId).single();
  if (!ownerProfile?.user_id) return NextResponse.json({ error: 'Store owner not found' }, { status: 500 });

  // Staff always sell against the owner's plan (there's no separate staff
  // subscription), so this also gates POS access for any staff account
  // whose owner has since downgraded or let their plan lapse.
  const ownerTier = getEffectiveTier(ownerProfile as any, 'supplier');
  if (ownerTier !== 'business' && ownerTier !== 'enterprise') {
    return NextResponse.json({ error: 'POS checkout requires an active Business or Enterprise plan' }, { status: 402 });
  }

  // Staff are pinned to their assigned store — they can't switch branches
  // from the client even if the request tries to. The owner can pick any
  // of their own stores (multi-branch, Enterprise tier); requestedStoreId
  // is validated against the owner's actual stores below either way.
  const requestedStoreId: string | null = actor.kind === 'staff' ? actor.storeId : (body.storeId ?? null);

  let storeId: string | null = null;
  if (requestedStoreId) {
    const { data: requestedStore } = await (admin.from as any)('stores')
      .select('id').eq('id', requestedStoreId).eq('supplier_id', actor.ownerId).maybeSingle();
    storeId = requestedStore?.id ?? null;
  }
  if (!storeId) {
    const { data: store } = await (admin.from as any)('stores')
      .select('id').eq('supplier_id', actor.ownerId).eq('is_primary', true).maybeSingle();
    storeId = store?.id;
    if (!storeId) {
      // Lazily create the default store — covers suppliers who registered
      // products before this migration's backfill, or a first-ever POS use.
      const { data: newStore } = await (admin.from as any)('stores')
        .insert({ supplier_id: actor.ownerId, name: 'Main Branch', is_primary: true })
        .select('id').single();
      storeId = newStore?.id;
    }
  }
  if (!storeId) return NextResponse.json({ error: 'Could not resolve your store. Please try again.' }, { status: 500 });

  const { data: saleId, error } = await (admin as any).rpc('create_pos_sale', {
    p_store_id: storeId,
    p_supplier_user_id: ownerProfile.user_id,
    p_items: items.map(i => ({
      product_id: i.productId ?? null,
      product_name: i.productName,
      sku: i.sku ?? null,
      quantity: i.quantity,
      unit_price_ugx: i.unitPriceUgx,
    })),
    p_payment_method: paymentMethod,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_discount_ugx: discountUgx,
    p_staff_id: actor.staffId,
  });

  if (error || !saleId) {
    return NextResponse.json({ error: error?.message ?? 'Checkout failed. Please try again.' }, { status: error?.message?.includes('stock') ? 409 : 500 });
  }

  return NextResponse.json({ success: true, saleId });
}
