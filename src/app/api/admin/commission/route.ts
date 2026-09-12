/**
 * GET  /api/admin/commission  — get current commission settings (admin only)
 * PUT  /api/admin/commission  — upsert commission settings (admin only)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { withApiLogging } from '@/lib/system-log';
import { isCulpritAdminName } from '@/lib/admin-guard';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return { user: null, error: 'Admin only', status: 403 };

  // Block culprits from admin access
  if (isCulpritAdminName((profile as any)?.full_name, user.email)) {
    return { user: null, error: 'Account unauthorized for administration.', status: 403 };
  }

  return { user, error: null, status: 200 };
}

async function handleGET() {
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
    console.error('[/api/admin/commission GET]', dbErr);
    return NextResponse.json({ error: 'Failed to load commission settings.' }, { status: 500 });
  }

  let platformWallet: { balance: number; account_number: string; owner_name: string | null } | null = null;
  if (data?.platform_wallet_user_id) {
    const [{ data: wallet }, { data: owner }] = await Promise.all([
      (db.from as any)('wallets').select('balance, account_number').eq('user_id', data.platform_wallet_user_id).maybeSingle(),
      (db.from as any)('profiles').select('full_name').eq('user_id', data.platform_wallet_user_id).maybeSingle(),
    ]);
    if (wallet) platformWallet = { balance: Number(wallet.balance), account_number: wallet.account_number, owner_name: owner?.full_name ?? null };
  }

  // Candidate admin accounts the platform wallet can be assigned to (strictly exclude culprits)
  const { data: rawAdmins } = await (db.from as any)('profiles')
    .select('user_id, full_name')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  const safeAdmins = (rawAdmins ?? []).filter((a: any) => !isCulpritAdminName(a.full_name));

  // If current platform wallet was assigned to a culprit, detach it
  let activeWalletUserId = data?.platform_wallet_user_id ?? null;
  if (activeWalletUserId && platformWallet?.owner_name && isCulpritAdminName(platformWallet.owner_name)) {
    activeWalletUserId = null;
    platformWallet = null;
  }

  return NextResponse.json({
    data: data ? { ...data, platform_wallet_user_id: activeWalletUserId } : { rate_percent: 2.5, min_fee_ugx: 500, max_fee_ugx: null, platform_wallet_user_id: null },
    platformWallet,
    admins: safeAdmins,
  });
}

async function handlePUT(req: Request) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  let body: { rate_percent?: number; min_fee_ugx?: number; max_fee_ugx?: number | null; platform_wallet_user_id?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rate_percent, min_fee_ugx, max_fee_ugx, platform_wallet_user_id } = body;
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

  // Carry over the existing platform wallet designation unless the caller
  // explicitly passed a new one
  const { data: current } = await (db.from as any)('platform_commission')
    .select('platform_wallet_user_id').eq('active', true).maybeSingle();
  let nextWalletUserId = platform_wallet_user_id !== undefined ? platform_wallet_user_id : (current?.platform_wallet_user_id ?? null);

  // Validate that recipient account is not a culprit/test account
  if (nextWalletUserId) {
    const { data: candidate } = await (db.from as any)('profiles')
      .select('full_name, role')
      .eq('user_id', nextWalletUserId)
      .maybeSingle();
    if (!candidate || candidate.role !== 'admin' || isCulpritAdminName(candidate.full_name)) {
      return NextResponse.json({ error: 'Selected account cannot receive platform commissions.' }, { status: 400 });
    }
  }

  // Deactivate existing active row, then insert new one (audit trail preserved)
  await (db.from as any)('platform_commission').update({ active: false }).eq('active', true);

  const { data, error: insertErr } = await (db.from as any)('platform_commission').insert({
    rate_percent,
    min_fee_ugx,
    max_fee_ugx: max_fee_ugx ?? null,
    platform_wallet_user_id: nextWalletUserId,
    active: true,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).select().single();

  if (insertErr) {
    console.error('[/api/admin/commission PUT]', insertErr);
    return NextResponse.json({ error: 'Failed to save commission settings. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export const GET = withApiLogging('/api/admin/commission', handleGET);
export const PUT = withApiLogging('/api/admin/commission', handlePUT);
