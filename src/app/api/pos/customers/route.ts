import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

// CRM is an Enterprise-tier feature. No dedicated customer table at this
// scale — grouping pos_sales by customer_phone (already captured at
// checkout) is enough; a real customers table can be added later if
// suppliers need notes/tags per customer.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role, roles, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can view customers' }, { status: 403 });

  if (getEffectiveTier(profile as any, 'supplier') !== 'enterprise') {
    return NextResponse.json({ error: 'Customer records require the Enterprise plan.' }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: sales } = await (admin.from as any)('pos_sales')
    .select('customer_name, customer_phone, total_ugx, created_at')
    .eq('supplier_id', (profile as any).id)
    .not('customer_phone', 'is', null)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const byPhone: Record<string, { name: string; phone: string; orderCount: number; totalSpent: number; lastSeen: string }> = {};
  for (const s of sales ?? []) {
    const phone = s.customer_phone;
    if (!byPhone[phone]) byPhone[phone] = { name: s.customer_name || 'Customer', phone, orderCount: 0, totalSpent: 0, lastSeen: s.created_at };
    byPhone[phone].orderCount += 1;
    byPhone[phone].totalSpent += Number(s.total_ugx);
    if (s.created_at > byPhone[phone].lastSeen) byPhone[phone].lastSeen = s.created_at;
    if (s.customer_name) byPhone[phone].name = s.customer_name;
  }

  const customers = Object.values(byPhone).sort((a, b) => b.totalSpent - a.totalSpent);
  return NextResponse.json({ customers });
}
