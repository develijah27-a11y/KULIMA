/**
 * GET  /api/favourites/suppliers          — list farmer's favourite suppliers
 * POST /api/favourites/suppliers          — add a supplier to favourites
 * DELETE /api/favourites/suppliers?supplierId=xxx — remove from favourites
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('farmer_favourites')
    .select('id, supplier_id, created_at, supplier:profiles!farmer_favourites_supplier_id_fkey(id, full_name, location, verification_level)')
    .eq('farmer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[/api/favourites/suppliers]', error);
    return NextResponse.json({ error: 'Failed to load favourites. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { supplierId } = await req.json();
  if (!supplierId) return NextResponse.json({ error: 'supplierId required' }, { status: 400 });

  const { data, error } = await (supabase.from as any)('farmer_favourites')
    .insert({ farmer_id: user.id, supplier_id: supplierId })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in favourites' }, { status: 409 });
    }
    console.error('[/api/favourites/suppliers]', error);
    return NextResponse.json({ error: 'Failed to add favourite. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplierId');
  if (!supplierId) return NextResponse.json({ error: 'supplierId required' }, { status: 400 });

  const { error } = await (supabase.from as any)('farmer_favourites')
    .delete()
    .eq('farmer_id', user.id)
    .eq('supplier_id', supplierId);

  if (error) {
    console.error('[/api/favourites/suppliers]', error);
    return NextResponse.json({ error: 'Failed to remove favourite. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
