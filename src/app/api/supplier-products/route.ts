import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';
import { getPosActor } from '@/lib/pos/getPosActor';

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data as { id: string } | null;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // A POS staff account needs to browse their owner's catalogue at the
  // till (to scan/search products) even though their own profiles.id has
  // no products of its own — resolve the effective owner via getPosActor
  // instead of assuming the caller's own profile is always the supplier.
  const admin = createServiceRoleClient();
  const actor = await getPosActor(admin, user.id);
  const ownerProfileId = actor?.ownerId ?? (await getProfile(supabase, user.id))?.id;
  if (!ownerProfileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // ?storeId= scopes to one branch (the till always passes the currently
  // selected store, so a product added at Branch A never shows up while
  // ringing up a sale at Branch B) — omitted entirely for the owner's full
  // catalogue management view, which still shows everything across branches.
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  let query = (admin.from as any)('supplier_products')
    .select('*')
    .eq('supplier_id', ownerProfileId);
  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

  if (error) {
    console.error('[/api/supplier-products GET]', error);
    return NextResponse.json({ error: 'Failed to load products. Please try again.' }, { status: 500 });
  }
  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { name, category, description, price_per_unit, unit, stock_qty, min_order_qty, low_stock_threshold, district, image_url, sku, barcode, cost_price_ugx, store_id } = body;

  if (!name || !price_per_unit || price_per_unit <= 0) {
    return NextResponse.json({ error: 'Name and valid price are required' }, { status: 400 });
  }
  if (!image_url) {
    return NextResponse.json({ error: 'A live photo of the product is required' }, { status: 400 });
  }

  // Every product belongs to a store. If the caller (multi-branch,
  // Enterprise tier) named a specific branch, use it — verified as
  // actually theirs first, never trusted blindly. Otherwise fall back to
  // the default primary store, lazily creating one for suppliers who
  // registered products before stores existed.
  let store: { id: string } | null = null;
  if (store_id) {
    const { data: requested } = await (supabase.from as any)('stores')
      .select('id').eq('id', store_id).eq('supplier_id', profile.id).maybeSingle();
    store = requested;
  }
  if (!store) {
    const { data: primary } = await (supabase.from as any)('stores')
      .select('id').eq('supplier_id', profile.id).eq('is_primary', true).maybeSingle();
    store = primary;
  }
  if (!store) {
    const { data: newStore } = await (supabase.from as any)('stores')
      .insert({ supplier_id: profile.id, name: 'Main Branch', is_primary: true })
      .select('id').single();
    store = newStore;
  }

  const { data, error } = await (supabase.from as any)('supplier_products').insert({
    supplier_id: profile.id,
    store_id: store?.id ?? null,
    name: name.trim(),
    category: category ?? 'other',
    description: description ?? null,
    price_per_unit: +price_per_unit,
    unit: unit ?? 'kg',
    stock_qty: +(stock_qty ?? 0),
    min_order_qty: +(min_order_qty ?? 1),
    low_stock_threshold: low_stock_threshold != null && low_stock_threshold !== '' ? +low_stock_threshold : null,
    district: district ?? null,
    image_url,
    sku: sku?.trim() || null,
    barcode: barcode?.trim() || null,
    cost_price_ugx: cost_price_ugx != null && cost_price_ugx !== '' ? +cost_price_ugx : null,
    is_available: true,
  }).select().single();

  if (error) {
    console.error('[/api/supplier-products POST]', error);
    // idx_supplier_products_store_barcode (UNIQUE store_id+barcode) means
    // this exact barcode was already saved on another product in this
    // store — the generic 500 this used to return gave zero indication of
    // that, so a re-scan just silently failed to save with no clue why
    // (and then correctly reported "no product found" at checkout, since
    // the product genuinely never made it into the database).
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This barcode is already saved on another product in this store. Edit that product instead, or scan a different item.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const allowed = ['name','category','description','price_per_unit','unit','stock_qty','min_order_qty','low_stock_threshold','district','is_available','image_url','sku','barcode','cost_price_ugx','store_id'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (k in fields) update[k] = fields[k];
  }

  const { error } = await (supabase.from as any)('supplier_products')
    .update(update)
    .eq('id', id)
    .eq('supplier_id', profile.id);

  if (error) {
    console.error('[/api/supplier-products PATCH]', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This barcode is already saved on another product in this store.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update product. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await (supabase.from as any)('supplier_products')
    .delete()
    .eq('id', id)
    .eq('supplier_id', profile.id);

  if (error) {
    console.error('[/api/supplier-products DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete product. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
