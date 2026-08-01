import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Vercel cron — weekly (Sunday midnight)
export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Service-role client throughout — this cron has no user session to scope
  // a regular client to, so `offers`/`farms` (owner-scoped RLS) would
  // otherwise always come back empty, and loan_profiles' write-side policy
  // is service_role-only anyway.
  const admin = createServiceRoleClient();

  const { data: farmers } = await admin.from('profiles').select('user_id, created_at');
  const { data: offers } = await admin.from('offers').select('buyer_id');
  const { data: farms } = await admin.from('farms').select('user_id, size_hectares');

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
    await admin.from('loan_profiles').upsert({
      farmer_id: s.farmerId, score: s.farmScore,
    });
  }

  return NextResponse.json({ success: true, updated: scores.length });
}
