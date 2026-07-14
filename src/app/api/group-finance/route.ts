import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('group_finance')
    .select('*')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[/api/group-finance]', error);
    return NextResponse.json({ error: 'Failed to load group finance records.' }, { status: 500 });
  }
  return NextResponse.json(
    { records: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, amount, description, member_name } = body;

  if (!type || !amount || !description) {
    return NextResponse.json({ error: 'Type, amount and description are required' }, { status: 400 });
  }
  if (!['contribution', 'income', 'expense', 'loan'].includes(type)) {
    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('group_finance').insert({
    admin_id:    user.id,
    type,
    amount:      Number(amount),
    description: description.trim(),
    member_name: member_name ?? null,
    created_at:  new Date().toISOString(),
  }).select().single();

  if (error) {
    console.error('[/api/group-finance]', error);
    return NextResponse.json({ error: 'Failed to save the transaction.' }, { status: 500 });
  }
  return NextResponse.json({ record: data }, { status: 201 });
}
