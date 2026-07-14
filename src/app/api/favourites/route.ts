/**
 * GET  /api/favourites          — list buyer's favourite farmers
 * POST /api/favourites          — add a farmer to favourites
 * DELETE /api/favourites?farmerId=xxx — remove from favourites
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('buyer_favourites')
    .select('id, farmer_id, created_at, farmer:profiles!buyer_favourites_farmer_id_fkey(id, full_name, location, primary_crop)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[/api/favourites]', error);
    return NextResponse.json({ error: 'Failed to load favourites. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { farmerId } = await req.json();
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const { data, error } = await (supabase.from as any)('buyer_favourites')
    .insert({ buyer_id: user.id, farmer_id: farmerId })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in favourites' }, { status: 409 });
    }
    console.error('[/api/favourites]', error);
    return NextResponse.json({ error: 'Failed to add favourite. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const farmerId = searchParams.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const { error } = await (supabase.from as any)('buyer_favourites')
    .delete()
    .eq('buyer_id', user.id)
    .eq('farmer_id', farmerId);

  if (error) {
    console.error('[/api/favourites]', error);
    return NextResponse.json({ error: 'Failed to remove favourite. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
