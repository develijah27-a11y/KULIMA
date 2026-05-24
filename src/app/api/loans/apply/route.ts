import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  farmerId: z.string(), cropType: z.string(),
  requestedAmount: z.number().optional(),
});

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: { message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid body' } }, { status: 400 });

  const { farmerId, cropType, requestedAmount } = parsed.data;
  const supabase = await createClient();

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

  await supabase.from('loan_profiles').upsert({
    farmer_id: farmerId, score: farmScore,
    status: approved ? 'approved' : 'pending_review',
  });

  return NextResponse.json({ success: true, data: { farmScore, creditLimit: maxLoan, approved } });
}
