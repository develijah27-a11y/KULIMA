/**
 * POST   /api/supplier-products/[id]/flash  — start a flash deal
 * DELETE /api/supplier-products/[id]/flash  — end a flash deal early
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

async function getSupplierProfileId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return (data as any)?.id ?? null;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await getSupplierProfileId(supabase, user.id);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  let body: { discountPct: number; durationHrs: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { discountPct, durationHrs } = body;
  if (!discountPct || discountPct < 1 || discountPct > 90) {
    return NextResponse.json({ error: 'discountPct must be 1–90' }, { status: 400 });
  }
  if (!durationHrs || durationHrs < 1 || durationHrs > 168) {
    return NextResponse.json({ error: 'durationHrs must be 1–168' }, { status: 400 });
  }

  // Verify the product belongs to this supplier
  const { data: product } = await (supabase.from as any)('supplier_products')
    .select('id, price_per_unit, supplier_id')
    .eq('id', id)
    .eq('supplier_id', profileId)
    .single();

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  if ((product as any).is_flash_deal) {
    return NextResponse.json({ error: 'Product already has an active flash deal' }, { status: 409 });
  }

  const flashPrice = Math.round(Number((product as any).price_per_unit) * (1 - discountPct / 100));
  const now        = new Date();
  const endsAt     = new Date(now.getTime() + durationHrs * 3_600_000);

  const { error } = await (supabase.from as any)('supplier_products').update({
    is_flash_deal:   true,
    flash_price_ugx: flashPrice,
    flash_starts_at: now.toISOString(),
    flash_ends_at:   endsAt.toISOString(),
    updated_at:      now.toISOString(),
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, flash_price_ugx: flashPrice, flash_ends_at: endsAt.toISOString() }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await getSupplierProfileId(supabase, user.id);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { error } = await (supabase.from as any)('supplier_products').update({
    is_flash_deal:   false,
    flash_price_ugx: null,
    flash_starts_at: null,
    flash_ends_at:   null,
    updated_at:      new Date().toISOString(),
  }).eq('id', id).eq('supplier_id', profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
