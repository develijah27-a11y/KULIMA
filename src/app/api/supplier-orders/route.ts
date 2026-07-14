import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data as { id: string } | null;
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
    .select('id, product_name, category, quantity, unit, amount, unit_price, status, notes, buyer_name, district, supplier_id, buyer_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (role === 'farmer') {
    query = query.eq('buyer_id', profile.id);
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
