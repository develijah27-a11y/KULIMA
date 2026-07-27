import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

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

  const { data: profile } = await (supabase.from as any)('profiles').select('id, role, roles').eq('user_id', user.id).single();
  const isSupplier = profile?.role === 'supplier' || (profile?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can use the POS till' }, { status: 403 });

  const body = await req.json();
  const items: CheckoutItem[] = Array.isArray(body.items) ? body.items : [];
  const paymentMethod: string = body.paymentMethod ?? 'cash';
  const customerName: string | null = body.customerName ?? null;
  const customerPhone: string | null = body.customerPhone ?? null;
  const discountUgx: number = Number(body.discountUgx ?? 0);

  if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  if (!['cash', 'wallet', 'mobile_money'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  }
  for (const item of items) {
    if (!item.productName || !(Number(item.quantity) > 0) || !(Number(item.unitPriceUgx) >= 0)) {
      return NextResponse.json({ error: 'Every item needs a name, quantity, and price' }, { status: 400 });
    }
  }

  const admin = createServiceRoleClient();

  const { data: store } = await (admin.from as any)('stores')
    .select('id').eq('supplier_id', profile.id).eq('is_primary', true).maybeSingle();
  let storeId = store?.id;
  if (!storeId) {
    // Lazily create the default store — covers suppliers who registered
    // products before this migration's backfill, or a first-ever POS user.
    const { data: newStore } = await (admin.from as any)('stores')
      .insert({ supplier_id: profile.id, name: 'Main Branch', is_primary: true })
      .select('id').single();
    storeId = newStore?.id;
  }
  if (!storeId) return NextResponse.json({ error: 'Could not resolve your store. Please try again.' }, { status: 500 });

  const { data: saleId, error } = await (admin as any).rpc('create_pos_sale', {
    p_store_id: storeId,
    p_supplier_user_id: user.id,
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
  });

  if (error || !saleId) {
    return NextResponse.json({ error: error?.message ?? 'Checkout failed. Please try again.' }, { status: error?.message?.includes('stock') ? 409 : 500 });
  }

  return NextResponse.json({ success: true, saleId });
}
