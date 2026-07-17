/**
 * POST /api/consultations — farmer books a paid consultation
 * GET  /api/consultations — list consultations for current user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { notifyUser } from '@/lib/notify';
import { logSystemEvent } from '@/lib/system-log';

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
  if (error) {
    console.error('[/api/consultations]', error);
    return NextResponse.json({ error: 'Failed to load consultations. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`consultation-book:${user.id}`, 5, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }

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

  // Atomic: locks the farmer's wallet row, moves the fee to the pathologist
  // (80% share) in one transaction — closes the race where a double-
  // submitted booking could double-charge the farmer and double-pay the
  // pathologist. Also prevents a duplicate consultation row on a rapid
  // double-submit, since the row lock serializes concurrent calls for the
  // same farmer.
  const pathologistShare = assigned ? Math.round(feeUgx * 0.8) : 0;
  const { error: payErr } = await (db as any).rpc('claim_consultation_payment', {
    p_farmer_user_id: user.id,
    p_pathologist_user_id: assigned?.user_id ?? null,
    p_total_fee: feeUgx,
    p_pathologist_share: pathologistShare,
  });
  if (payErr) {
    console.error('[/api/consultations]', payErr);
    logSystemEvent({
      category: 'failed_payment',
      level: 'error',
      route: '/api/consultations',
      method: 'POST',
      userId: user.id,
      message: `Consultation payment failed: ${payErr.message}`,
      metadata: { type, feeUgx },
    });
    return NextResponse.json({ error: payErr.message?.includes('Insufficient') ? payErr.message : 'Payment failed. Please try again.' }, { status: 400 });
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
  }).select().single();

  if (insertErr) {
    console.error('[/api/consultations]', insertErr);
    return NextResponse.json({ error: 'Failed to book consultation. Please try again.' }, { status: 500 });
  }

  // Notify pathologist if matched
  if (assigned) {
    await notifyUser(db, {
      userId: assigned.user_id,
      role:    'pathologist',
      type:    'alert',
      title:   `New ${type === 'farm_visit' ? 'farm visit request' : 'remote consultation'}`,
      body:    `A farmer in ${farmerDistrict} has booked a consultation with you. Open the app to connect.`,
      data:    { consultation_id: (consultation as any)?.id },
      url:     '/pathologist/consultations',
    });
  }

  return NextResponse.json({
    success:      true,
    data:         consultation,
    assigned:     assigned ? { name: assigned.full_name, district: assigned.location } : null,
    feeDeducted:  feeUgx,
  }, { status: 201 });
}
