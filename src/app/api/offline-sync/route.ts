import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Method = 'insert' | 'update' | 'delete';

const ALLOWED_TABLES = new Set([
  'farm_logs', 'expenses', 'inventory', 'worker_attendance',
  'planting_records', 'market_prices',
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { table: string; method: Method; payload: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { table, method, payload } = body;

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Table '${table}' not allowed for offline sync` }, { status: 400 });
  }

  if (!['insert', 'update', 'delete'].includes(method)) {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  }

  // Stamp the authenticated user on every record
  const stamped = { ...payload, user_id: user.id };

  let error: unknown = null;
  if (method === 'insert') {
    ({ error } = await supabase.from(table as any).insert(stamped));
  } else if (method === 'update') {
    const id = payload.id;
    if (!id) return NextResponse.json({ error: 'Missing id for update' }, { status: 400 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = payload;
    ({ error } = await supabase.from(table as any).update({ ...rest, user_id: user.id }).eq('id', id).eq('user_id', user.id));
  } else if (method === 'delete') {
    const id = payload.id;
    if (!id) return NextResponse.json({ error: 'Missing id for delete' }, { status: 400 });
    ({ error } = await supabase.from(table as any).delete().eq('id', id).eq('user_id', user.id));
  }

  if (error) {
    return NextResponse.json({ error: (error as any).message ?? 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
