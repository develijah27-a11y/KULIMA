import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const schema = z.object({
  cropType: z.string(),
  requestedAmount: z.number().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: { message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid body' } }, { status: 400 });

  const { requestedAmount } = parsed.data;
  // farmerId is always the caller's own auth id — never trust a client-supplied
  // id here, or anyone could submit a loan application (and trigger a stored
  // approval decision) against an arbitrary farmer.
  const farmerId = user.id;

  // Calculate farm score
  const { data: farms } = await supabase.from('farms').select('*').eq('user_id', farmerId);
  const { data: offers } = await supabase.from('offers').select('*').eq('buyer_id', farmerId).eq('status', 'completed');
  const { data: crops } = await supabase.from('crops').select('*').in('farm_id', (farms ?? []).map((f: any) => f.id));

  let farmScore = 0;
  if (crops?.length && crops.length > 0) farmScore += 20;
  if (offers?.length && offers.length > 0) farmScore += 15;
  if ((farms ?? []).some((f: any) => (f.size_hectares ?? 0) > 0.5)) farmScore += 10;
  if ((farms ?? []).length > 0) farmScore += 10;

  const maxLoan = farmScore * 10000;
  const approved = requestedAmount ? requestedAmount <= maxLoan : false;

  // loan_profiles only grants write access to service_role (see RLS policy
  // service_manages_loan_profiles) — the regular cookie-scoped client can't
  // write here at all, so this previously failed silently on every request
  // while still telling the caller { success: true }.
  const admin = createServiceRoleClient();
  const { error } = await admin.from('loan_profiles').upsert({
    farmer_id: farmerId, score: farmScore,
    status: approved ? 'approved' : 'pending_review',
    credit_limit: maxLoan,
  }, { onConflict: 'farmer_id' });

  if (error) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });

  return NextResponse.json({ success: true, data: { farmScore, creditLimit: maxLoan, approved } });
}
