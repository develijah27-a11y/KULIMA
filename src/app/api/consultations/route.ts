/**
 * POST /api/consultations — farmer books a paid consultation
 * GET  /api/consultations — list consultations for current user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Platform defaults used only when a pathologist hasn't set their own rate —
// pathologists can set remote_fee_ugx / visit_fee_ugx on their own profile.
const REMOTE_FEE_UGX  = 15000;
const VISIT_FEE_UGX   = 50000;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') ?? 'farmer';

  const query = (supabase.from as any)('consultations')
    .select('*, pathologist:profiles!consultations_pathologist_id_fkey(full_name, location)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (role === 'pathologist') {
    query.eq('pathologist_id', user.id);
  } else {
    query.eq('farmer_id', user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, diseaseReportId, notes } = body;
  if (!type || !['remote', 'farm_visit'].includes(type)) {
    return NextResponse.json({ error: 'type must be "remote" or "farm_visit"' }, { status: 400 });
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get farmer's district for region-matching
  const { data: farmerProfile } = await (db.from as any)('profiles')
    .select('location').eq('user_id', user.id).single();
  const farmerDistrict = farmerProfile?.location ?? '';

  // Match nearest pathologist (same district first, then any available)
  const { data: matchedPaths } = await (db.from as any)('profiles')
    .select('id, user_id, full_name, location, remote_fee_ugx, visit_fee_ugx')
    .eq('role', 'pathologist')
    .order('location', { ascending: true })
    .limit(10);

  // Prefer same district for farm visits; any for remote
  const sorted = (matchedPaths ?? []).sort((a: any, b: any) => {
    const aMatch = (a.location ?? '').toLowerCase() === farmerDistrict.toLowerCase() ? 0 : 1;
    const bMatch = (b.location ?? '').toLowerCase() === farmerDistrict.toLowerCase() ? 0 : 1;
    return aMatch - bMatch;
  });
  const assigned = sorted[0] ?? null;

  // The fee is whatever the matched pathologist has set for this
  // consultation type — each crop doctor decides their own price. Falls
  // back to the platform default only if they haven't set one, or if no
  // pathologist could be matched yet.
  const assignedFee = type === 'farm_visit' ? assigned?.visit_fee_ugx : assigned?.remote_fee_ugx;
  const feeUgx = Number(assignedFee) > 0 ? Number(assignedFee) : (type === 'farm_visit' ? VISIT_FEE_UGX : REMOTE_FEE_UGX);

  // Check farmer wallet balance
  const { data: wallet } = await (db.from as any)('wallets')
    .select('id, balance').eq('user_id', user.id).single();
  if (!wallet || Number(wallet.balance) < feeUgx) {
    return NextResponse.json({
      error: `Insufficient wallet balance. This ${type === 'farm_visit' ? 'farm visit' : 'remote consultation'} costs UGX ${feeUgx.toLocaleString()}.`,
    }, { status: 400 });
  }

  // Deduct fee from farmer wallet
  const { error: deductErr } = await (db.from as any)('wallets').update({
    balance:    Number(wallet.balance) - feeUgx,
    updated_at: new Date().toISOString(),
  }).eq('id', wallet.id);
  if (deductErr) return NextResponse.json({ error: 'Payment failed' }, { status: 500 });

  // Log fee transaction
  const { data: txn } = await (db.from as any)('wallet_transactions').insert({
    wallet_id:   wallet.id,
    user_id:     user.id,
    type:        'fee',
    amount:      feeUgx,
    status:      'completed',
    description: `${type === 'farm_visit' ? 'Farm visit' : 'Remote'} consultation fee`,
  }).select('id').single();

  // If pathologist found, credit their wallet (80% — platform keeps 20%)
  if (assigned) {
    const pathologistShare = Math.round(feeUgx * 0.8);
    const { data: pathWallet } = await (db.from as any)('wallets')
      .select('id, balance').eq('user_id', assigned.user_id).single();
    if (pathWallet) {
      await Promise.all([
        (db.from as any)('wallets').update({
          balance:    Number(pathWallet.balance) + pathologistShare,
          updated_at: new Date().toISOString(),
        }).eq('id', pathWallet.id),
        (db.from as any)('wallet_transactions').insert({
          wallet_id:   pathWallet.id,
          user_id:     assigned.user_id,
          type:        'payout',
          amount:      pathologistShare,
          status:      'completed',
          description: `${type === 'farm_visit' ? 'Farm visit' : 'Remote'} consultation payment`,
        }),
      ]);
    }
  }

  // Create consultation record
  const { data: consultation, error: insertErr } = await (db.from as any)('consultations').insert({
    farmer_id:            user.id,
    pathologist_id:       assigned?.user_id ?? null,
    disease_report_id:    diseaseReportId ?? null,
    type,
    status:               assigned ? 'matched' : 'pending',
    fee_ugx:              feeUgx,
    farmer_district:      farmerDistrict,
    pathologist_district: assigned?.location ?? null,
    notes:                notes ?? null,
    payment_txn_id:       txn?.id ?? null,
  }).select().single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Notify pathologist if matched
  if (assigned) {
    await (db.from as any)('notifications').insert({
      user_id: assigned.user_id,
      type:    'alert',
      title:   `New ${type === 'farm_visit' ? 'farm visit request' : 'remote consultation'}`,
      body:    `A farmer in ${farmerDistrict} has booked a consultation with you. Open the app to connect.`,
      data:    { consultation_id: (consultation as any)?.id },
    });
  }

  return NextResponse.json({
    success:      true,
    data:         consultation,
    assigned:     assigned ? { name: assigned.full_name, district: assigned.location } : null,
    feeDeducted:  feeUgx,
  }, { status: 201 });
}
