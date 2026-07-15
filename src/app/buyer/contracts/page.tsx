import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: C.muted,                bg: 'var(--color-surface-2)' },
  active:    { label: 'Active',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  completed: { label: 'Completed', color: 'var(--color-purple)', bg: 'var(--color-purple-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

export default async function BuyerContractsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Check if buyer has any offtaker contracts (offtaker role might overlap with buyer)
  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, status, delivery_date, created_at, farmer_name')
    .eq('offtaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (contracts ?? []) as any[];
  const active    = rows.filter(c => c.status === 'active');
  const completed = rows.filter(c => c.status === 'completed');
  const totalValue = active.reduce((s: number, c: any) => s + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Forward Contracts
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Lock in prices with farmers ahead of harvest</p>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--color-success-bg)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-success)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{active.length}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>Active Contracts</p>
          </div>
          <div style={{ background: 'var(--color-purple-bg)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-purple)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
              {totalValue > 0 ? `UGX ${Math.round(totalValue / 1000000).toFixed(1)}M` : `${completed.length}`}
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', margin: 0 }}>{totalValue > 0 ? 'Pipeline Value' : 'Completed'}</p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>No contracts yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 8, maxWidth: 340, margin: '0 auto 20px' }}>
            Forward contracts let you lock in prices with farmers before harvest — reducing price risk and guaranteeing supply.
          </p>
          <Link href="/buyer/listings" style={{ display: 'inline-block', padding: '11px 22px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Find Farmers →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>All Contracts</p>
          </div>
          {rows.map((c: any, i: number) => {
            const st = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
            const value = (c.price_ugx ?? 0) * (c.quantity_kg ?? 0);
            return (
              <div key={c.id} style={{ padding: '14px 18px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                      {c.crop_type}
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>
                    {c.quantity_kg} kg · UGX {Number(c.price_ugx).toLocaleString()}/kg
                    {c.farmer_name && ` · ${c.farmer_name}`}
                  </p>
                  {c.delivery_date && (
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      Delivery {new Date(c.delivery_date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 2px' }}>
                    UGX {Math.round(value).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>total value</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
