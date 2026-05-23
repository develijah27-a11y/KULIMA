import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel cron — weekly (Sunday midnight)
export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: farmers } = await supabase.from('profiles').select('user_id, created_at');
  const { data: offers } = await supabase.from('offers').select('buyer_id, rating');
  const { data: farms } = await supabase.from('farms').select('user_id, size_hectares');

  const farmCount: Record<string, { hasCycle: boolean; area: number; deals: number }> = {};
  (farms ?? []).forEach((f: any) => {
    if (!farmCount[f.user_id]) farmCount[f.user_id] = { hasCycle: false, area: 0, deals: 0 };
    farmCount[f.user_id].area += f.size_hectares ?? 0;
  });
  (offers ?? []).forEach((o: any) => { if (farmCount[o.buyer_id]) farmCount[o.buyer_id].deals++; });

  const scores = Object.entries(farmCount).map(([uid, fa]) => {
    let score = (fa.area > 0.5 ? 10 : 0) + (fa.deals > 0 ? 15 : 0);
    return { farmerId: uid, farmScore: score, creditLimit: score * 10000 };
  });

  // upsert LoanProfile records
  for (const s of scores) {
    await supabase.from('loan_profiles').upsert({
      farmer_id: s.farmerId, farm_score: s.farmScore, credit_limit: s.creditLimit,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true, updated: scores.length });
}
