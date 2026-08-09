/**
 * GET /api/admin/commission/earnings?period=today|7d|30d|12m
 * Returns commission earnings grouped by day/hour/month for charting.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return { user: null };
  return { user };
}

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? '7d';

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now  = new Date();
  let since: Date;
  let groupBy: 'hour' | 'day' | 'month';
  let labelFn: (d: Date) => string;
  let buckets: { label: string; start: Date; end: Date }[];

  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    groupBy = 'hour';
    buckets = Array.from({ length: 24 }, (_, i) => {
      const s = new Date(since); s.setHours(i);
      const e = new Date(since); e.setHours(i + 1);
      return { label: `${String(i).padStart(2, '0')}h`, start: s, end: e };
    });
  } else if (period === '7d') {
    since = new Date(Date.now() - 7 * 864e5);
    groupBy = 'day';
    buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 864e5);
      d.setHours(0, 0, 0, 0);
      const e = new Date(d); e.setDate(e.getDate() + 1);
      return {
        label: d.toLocaleDateString('en-UG', { weekday: 'short' }),
        start: d, end: e,
      };
    });
  } else if (period === '30d') {
    since = new Date(Date.now() - 30 * 864e5);
    groupBy = 'day';
    buckets = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5);
      d.setHours(0, 0, 0, 0);
      const e = new Date(d); e.setDate(e.getDate() + 1);
      return {
        label: i % 5 === 0 ? d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '',
        start: d, end: e,
      };
    });
  } else {
    // 12 months
    since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    groupBy = 'month';
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        label: d.toLocaleDateString('en-UG', { month: 'short' }),
        start: d, end: e,
      };
    });
  }

  // Fetch commission transactions in range
  // Commission fees are recorded as wallet_transactions with type='commission'
  // or as the commission_amount column on escrow_accounts.
  // We use wallet_transactions for accuracy since those are the actual debits.
  const { data: txns } = await (db.from as any)('wallet_transactions')
    .select('amount, created_at')
    .eq('type', 'commission')
    .eq('status', 'completed')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const rows = (txns ?? []) as { amount: number; created_at: string }[];

  // Aggregate into buckets
  const chart = buckets.map(({ label, start, end }) => {
    const total = rows
      .filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d < end;
      })
      .reduce((s, r) => s + Number(r.amount), 0);
    return { label, value: Math.round(total) };
  });

  const totalCommission = rows.reduce((s, r) => s + Number(r.amount), 0);
  const totalTransactions = rows.length;
  const avgFeePerTx = totalTransactions > 0 ? totalCommission / totalTransactions : 0;

  return NextResponse.json({
    data: {
      totalCommission: Math.round(totalCommission),
      totalTransactions,
      avgFeePerTx: Math.round(avgFeePerTx),
      chart,
    },
  });
}
