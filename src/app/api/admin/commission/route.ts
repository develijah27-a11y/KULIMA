/**
 * GET  /api/admin/commission  — get current commission settings (admin only)
 * PUT  /api/admin/commission  — upsert commission settings (admin only)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return { user: null, error: 'Admin only', status: 403 };

  return { user, error: null, status: 200 };
}

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error: dbErr } = await (db.from as any)('platform_commission')
    .select('rate_percent, min_fee_ugx, max_fee_ugx, platform_wallet_user_id, active, updated_at')
    .eq('active', true)
    .single();

  if (dbErr && dbErr.code !== 'PGRST116') {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? { rate_percent: 2.5, min_fee_ugx: 500, max_fee_ugx: null } });
}

export async function PUT(req: Request) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  let body: { rate_percent?: number; min_fee_ugx?: number; max_fee_ugx?: number | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rate_percent, min_fee_ugx, max_fee_ugx } = body;
  if (rate_percent === undefined || min_fee_ugx === undefined) {
    return NextResponse.json({ error: 'rate_percent and min_fee_ugx are required' }, { status: 400 });
  }
  if (rate_percent < 0 || rate_percent > 50) {
    return NextResponse.json({ error: 'rate_percent must be between 0 and 50' }, { status: 400 });
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Deactivate existing active row, then insert new one (audit trail preserved)
  await (db.from as any)('platform_commission').update({ active: false }).eq('active', true);

  const { data, error: insertErr } = await (db.from as any)('platform_commission').insert({
    rate_percent,
    min_fee_ugx,
    max_fee_ugx: max_fee_ugx ?? null,
    active: true,
    updated_at: new Date().toISOString(),
  }).select().single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ success: true, data });
}
