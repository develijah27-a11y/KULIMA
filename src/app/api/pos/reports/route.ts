import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

// Reports are a Business/Enterprise-tier feature — Free-tier suppliers can
// still use the till (Phase 3), but can't see aggregated performance data.
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role, roles, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can view reports' }, { status: 403 });

  const tier = getEffectiveTier(profile as any, 'supplier');
  if (tier !== 'business' && tier !== 'enterprise') {
    return NextResponse.json({ error: 'Reports require the Business plan or higher.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get('days') ?? 30), 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const admin = createServiceRoleClient();

  const [{ data: sales }, { data: items }, { data: stores }] = await Promise.all([
    (admin.from as any)('pos_sales')
      .select('id, store_id, staff_id, total_ugx, net_ugx, commission_fee_ugx, payment_method, status, created_at')
      .eq('supplier_id', (profile as any).id)
      .gte('created_at', since),
    (admin.from as any)('pos_sale_items')
      .select('product_id, product_name, quantity, line_total_ugx, pos_sale_id, pos_sales!inner(supplier_id, created_at)')
      .eq('pos_sales.supplier_id', (profile as any).id)
      .gte('pos_sales.created_at', since),
    (admin.from as any)('stores').select('id, name').eq('supplier_id', (profile as any).id),
  ]);

  const completedSales = (sales ?? []).filter((s: any) => s.status === 'completed');
  const totalSales = completedSales.reduce((sum: number, s: any) => sum + Number(s.total_ugx), 0);
  const totalNet = completedSales.reduce((sum: number, s: any) => sum + Number(s.net_ugx), 0);
  const totalFees = completedSales.reduce((sum: number, s: any) => sum + Number(s.commission_fee_ugx), 0);
  const saleCount = completedSales.length;

  const byPaymentMethod: Record<string, number> = {};
  for (const s of completedSales) {
    byPaymentMethod[s.payment_method] = (byPaymentMethod[s.payment_method] ?? 0) + Number(s.total_ugx);
  }

  const storeNameById = new Map((stores ?? []).map((s: any) => [s.id, s.name]));
  const byStore: Record<string, number> = {};
  for (const s of completedSales) {
    const name = (storeNameById.get(s.store_id) as string) ?? 'Unknown';
    byStore[name] = (byStore[name] ?? 0) + Number(s.total_ugx);
  }

  const byStaff: Record<string, number> = {};
  for (const s of completedSales) {
    const key = s.staff_id ?? 'owner';
    byStaff[key] = (byStaff[key] ?? 0) + Number(s.total_ugx);
  }

  const productTotals: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const it of items ?? []) {
    const key = it.product_id ?? it.product_name;
    if (!productTotals[key]) productTotals[key] = { name: it.product_name, quantity: 0, revenue: 0 };
    productTotals[key].quantity += Number(it.quantity);
    productTotals[key].revenue += Number(it.line_total_ugx);
  }
  const topProducts = Object.values(productTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return NextResponse.json({
    periodDays: days,
    totalSales,
    totalNet,
    totalFees,
    saleCount,
    byPaymentMethod,
    byStore,
    byStaff,
    topProducts,
  });
}
