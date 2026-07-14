import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data as { id: string } | null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data, error } = await (supabase.from as any)('supplier_products')
    .select('*')
    .eq('supplier_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(200);

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
  const { name, category, description, price_per_unit, unit, stock_qty, min_order_qty, district, image_url } = body;

  if (!name || !price_per_unit || price_per_unit <= 0) {
    return NextResponse.json({ error: 'Name and valid price are required' }, { status: 400 });
  }
  if (!image_url) {
    return NextResponse.json({ error: 'A live photo of the product is required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('supplier_products').insert({
    supplier_id: profile.id,
    name: name.trim(),
    category: category ?? 'other',
    description: description ?? null,
    price_per_unit: +price_per_unit,
    unit: unit ?? 'kg',
    stock_qty: +(stock_qty ?? 0),
    min_order_qty: +(min_order_qty ?? 1),
    district: district ?? null,
    image_url,
    is_available: true,
  }).select().single();

  if (error) {
    console.error('[/api/supplier-products POST]', error);
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

  const allowed = ['name','category','description','price_per_unit','unit','stock_qty','min_order_qty','district','is_available','image_url'];
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
