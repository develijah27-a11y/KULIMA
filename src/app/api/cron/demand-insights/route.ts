import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Vercel cron — runs daily at 08:30 EAT (05:30 UTC). Aggregates real
// supplier_orders system-wide (every dealer's customers, not just one
// dealer's own) into supplier_demand_insights, which the agro-dealer
// "What Farmers Need" page reads from directly instead of aggregating
// the whole orders table on every dashboard view.
//
// Counted as a genuine purchase signal: status = confirmed/delivered,
// or payment already moved into escrow/released — excludes abandoned
// quote requests, still-pending carts, and cancelled orders.

export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: orders, error: fetchError } = await (supabase.from as any)('supplier_orders')
    .select('product_name, quantity, buyer_id, status, payment_status')
    .or('status.in.(confirmed,delivered),payment_status.in.(escrowed,released)')
    .limit(5000);

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  type Agg = { display: string; orderCount: number; totalQty: number; buyers: Set<string> };
  const byProduct = new Map<string, Agg>();

  for (const o of (orders ?? [])) {
    const name = (o.product_name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const agg = byProduct.get(key) ?? { display: name, orderCount: 0, totalQty: 0, buyers: new Set<string>() };
    agg.orderCount += 1;
    agg.totalQty += Number(o.quantity) || 0;
    if (o.buyer_id) agg.buyers.add(o.buyer_id);
    byProduct.set(key, agg);
  }

  const rows = Array.from(byProduct.values()).map(a => ({
    product_name: a.display,
    order_count: a.orderCount,
    total_qty: a.totalQty,
    buyer_count: a.buyers.size,
    computed_at: new Date().toISOString(),
  }));

  // Full replace — a product that stopped being ordered should drop out
  // of "what farmers need" rather than linger from a stale prior run.
  const { error: clearError } = await (supabase.from as any)('supplier_demand_insights')
    .delete()
    .neq('product_name', '__never_matches__');
  if (clearError) {
    return NextResponse.json({ success: false, error: clearError.message }, { status: 500 });
  }

  if (rows.length > 0) {
    const { error: insertError } = await (supabase.from as any)('supplier_demand_insights').insert(rows);
    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, products: rows.length, ordersScanned: (orders ?? []).length });
}
