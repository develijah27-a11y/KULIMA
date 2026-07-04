import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Banknote, Wallet, CheckCircle2, ClipboardList, BarChart3, AlertTriangle } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', blue: 'var(--color-sky)',
};

export default async function SupplierAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  const profileId = (profile as any)?.id ?? '';

  const [ordersRes, productsRes, walletRes] = await Promise.allSettled([
    (supabase.from as any)('supplier_orders').select('amount, status, created_at').eq('supplier_id', profileId).order('created_at', { ascending: false }).limit(100),
    (supabase.from as any)('supplier_products').select('id, name, stock_qty', { count: 'exact' }).eq('supplier_id', profileId),
    (supabase.from as any)('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
  ]);

  const orders   = ((ordersRes.status   === 'fulfilled' ? ordersRes.value.data   : null) ?? []) as any[];
  const products = ((productsRes.status === 'fulfilled' ? productsRes.value.data : null) ?? []) as any[];
  const balance  = walletRes.status === 'fulfilled' ? (walletRes.value.data?.balance ?? 0) : 0;

  const completedOrders = orders.filter((o: any) => o.status === 'delivered');
  const totalRevenue = completedOrders.reduce((s: number, o: any) => s + Number(o.amount ?? 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
  const lowStock = products.filter((p: any) => (p.stock_qty ?? 999) < 10).length;

  const stats = [
    { label: 'Total Revenue',   value: `UGX ${Math.round(totalRevenue).toLocaleString()}`, icon: <Banknote size={16} />,     color: C.green,                sub: 'From completed orders' },
    { label: 'Wallet Balance',  value: `UGX ${Math.round(balance).toLocaleString()}`,       icon: <Wallet size={16} />,       color: C.blue,                 sub: 'Available to withdraw' },
    { label: 'Orders Fulfilled',value: completedOrders.length,                              icon: <CheckCircle2 size={16} />, color: 'var(--color-success)', sub: 'All-time deliveries' },
    { label: 'Pending Orders',  value: pendingOrders,                                       icon: <ClipboardList size={16} />,color: C.amber,                sub: 'Need processing' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Your business performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon, color, sub }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{label}</p>
              <span style={{ display: 'flex', color }}>{icon}</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.03em', margin: '0 0 4px' }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {lowStock > 0 && (
        <div style={{ padding: '16px 20px', background: 'var(--color-danger-bg)', borderRadius: 14, border: '1px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} />{lowStock} product{lowStock !== 1 ? 's' : ''} running low on stock</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Restock soon to avoid missing orders</p>
          </div>
          <Link href="/supplier/catalogue" style={{ padding: '8px 16px', background: 'var(--color-danger)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
            View →
          </Link>
        </div>
      )}

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Recent Orders</p>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><BarChart3 size={32} style={{ color: C.muted }} /></div>
            <p style={{ color: C.muted, fontSize: 13 }}>No order history yet. Add products to your catalogue to start receiving orders.</p>
          </div>
        ) : (
          <div>
            {orders.slice(0, 10).map((o: any, i: number) => {
              const colors: Record<string, string> = { delivered: 'var(--color-success)', pending: C.amber, cancelled: 'var(--color-danger)', confirmed: C.blue };
              const color = colors[o.status] ?? C.muted;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>{o.status}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{new Date(o.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${color}20`, color }}>{o.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
