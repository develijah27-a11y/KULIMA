import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    .select('id, supplier_id, name, unit, price_per_unit, stock_qty, min_order_qty, is_available')
    .eq('id', productId)
    .single();

  if (!product || !product.is_available) return NextResponse.json({ error: 'Product not available' }, { status: 404 });
  if (+quantity < product.min_order_qty) {
    return NextResponse.json({ error: `Minimum order is ${product.min_order_qty} ${product.unit}` }, { status: 400 });
  }
  if (+quantity > product.stock_qty) {
    return NextResponse.json({ error: `Only ${product.stock_qty} ${product.unit} left in stock` }, { status: 400 });
  }

  const { data: order, error } = await (supabase.from as any)('supplier_orders').insert({
    supplier_id:  product.supplier_id,
    buyer_id:     user.id,
    buyer_name:   (profile as any).full_name ?? null,
    product_id:   product.id,
    product_name: product.name,
    quantity:     +quantity,
    unit:         product.unit,
    unit_price:   product.price_per_unit,
    amount:       +quantity * product.price_per_unit,
    district:     (profile as any).district ?? (profile as any).location ?? null,
    notes:        notes ?? null,
    status:       'pending',
  }).select().single();

  if (error) {
    console.error('[/api/supplier-orders POST]', error);
    return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 });
  }

  // Best-effort stock decrement — not transactional, but this is a
  // low-concurrency MVP catalogue and a lost decrement just means the
  // supplier double-checks stock, not an overselling risk at this scale.
  await (supabase.from as any)('supplier_products')
    .update({ stock_qty: product.stock_qty - +quantity, updated_at: new Date().toISOString() })
    .eq('id', product.id);

  const { data: supplierProfile } = await (supabase.from as any)('profiles').select('user_id').eq('id', product.supplier_id).single();
  if (supplierProfile?.user_id) {
    await (supabase.from as any)('notifications').insert({
      user_id: supplierProfile.user_id,
      role: 'supplier',
      type: 'order',
      title: `New input order — ${product.name}`,
      body: `${(profile as any).full_name ?? 'A farmer'} ordered ${quantity} ${product.unit} of ${product.name}.`,
      data: { supplier_order_id: (order as any).id },
    });
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

  const allowed = ['confirmed', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const { error } = await (supabase.from as any)('supplier_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('supplier_id', profile.id);

  if (error) {
    console.error('[/api/supplier-orders]', error);
    return NextResponse.json({ error: 'Failed to update order status. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
