import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Method = 'insert' | 'update' | 'delete';

const ALLOWED_TABLES = new Set([
  'farm_logs',
  'farm_expenses',
  'expenses',
  'farms',
  'inventory',
  'worker_attendance',
  'planting_records',
  'market_prices',
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Normalize table name: map 'expenses' to 'farm_expenses'
  const targetTable = table === 'expenses' ? 'farm_expenses' : table;

  // Clean and stamp the user id
  const stamped: Record<string, unknown> = { ...payload, user_id: user.id };

  // Type coercions for specific tables
  if (targetTable === 'farm_expenses') {
    if (stamped.amount_ugx !== undefined) stamped.amount_ugx = Number(stamped.amount_ugx);
    if (stamped.quantity !== undefined && stamped.quantity !== null && stamped.quantity !== '') {
      stamped.quantity = Number(stamped.quantity);
    }
  }

  if (targetTable === 'farms') {
    if (stamped.size_hectares !== undefined && stamped.size_hectares !== null && stamped.size_hectares !== '') {
      stamped.size_hectares = Number(stamped.size_hectares);
    }
    stamped.is_active = stamped.is_active ?? true;
  }

  let error: unknown = null;
  if (method === 'insert') {
    // Remove any client-generated temporary IDs before inserting
    if (typeof stamped.id === 'string' && (stamped.id.startsWith('offline-') || stamped.id.startsWith('local_'))) {
      delete stamped.id;
    }
    const res = await (supabase.from as any)(targetTable).insert(stamped).select();
    error = res.error;
  } else if (method === 'update') {
    const id = payload.id;
    if (!id) return NextResponse.json({ error: 'Missing id for update' }, { status: 400 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = stamped;
    const res = await (supabase.from as any)(targetTable)
      .update(rest)
      .eq('id', id)
      .eq('user_id', user.id);
    error = res.error;
  } else if (method === 'delete') {
    const id = payload.id;
    if (!id) return NextResponse.json({ error: 'Missing id for delete' }, { status: 400 });
    const res = await (supabase.from as any)(targetTable)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    error = res.error;
  }

  if (error) {
    console.error(`[offline-sync] Error executing ${method} on ${targetTable}:`, error);
    return NextResponse.json(
      { error: (error as any).message ?? 'Database synchronization error' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, table: targetTable });
}
