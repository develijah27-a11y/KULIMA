import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const STATUS_COLORS: Record<string, { c: string; bg: string }> = {
  open:       { c: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
  confirmed:  { c: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  delivered:  { c: C.greenMed,             bg: 'var(--color-primary-bg)' },
  cancelled:  { c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

export default async function BulkOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: orders } = await (supabase.from as any)('bulk_orders')
    .select('id, input_name, quantity, unit, price_ugx, supplier_name, status, delivery_date, created_at')
    .eq('group_admin_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const rows = (orders ?? []) as any[];
  const open = rows.filter((o: any) => o.status === 'open' || o.status === 'confirmed');
  const past = rows.filter((o: any) => o.status === 'delivered' || o.status === 'cancelled');

  const totalSavings = rows.reduce((s: number, o: any) => s + (o.savings_ugx ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Bulk Orders 📦</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Pool with your group to get supplier discounts on farm inputs</p>
        </div>
      </div>

      {totalSavings > 0 && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>💰</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.greenMed, margin: '0 0 2px' }}>Group Savings</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>UGX {totalSavings.toLocaleString()} saved vs. buying individually</p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No bulk orders yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 340, margin: '4px auto' }}>Start a bulk order for seeds, fertiliser, or pesticides to unlock group pricing from suppliers.</p>
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'var(--d-bg)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
            {[{ icon: '🌱', t: 'Seeds', d: 'Certified maize, bean, and sorghum seed varieties' },
              { icon: '🧪', t: 'Fertiliser', d: 'NPK, Urea, and DAP in bulk 50 kg bags' },
              { icon: '💧', t: 'Pesticides', d: 'Group-rated herbicides and insecticides' }].map(i => (
              <div key={i.t} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{i.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{i.t}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{i.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: 13, color: C.muted }}>Bulk ordering is coming soon — your group will be notified when it launches.</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active Orders ({open.length})</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {open.map((o: any, i: number) => {
                  const sc = STATUS_COLORS[o.status] ?? STATUS_COLORS.open;
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < open.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{o.input_name}</p>
                        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{o.quantity} {o.unit} · {o.supplier_name ?? 'Pending supplier'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.c }}>{o.status}</span>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '4px 0 0' }}>UGX {Math.round((o.price_ugx ?? 0) * (o.quantity ?? 1)).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Past Orders</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden', opacity: 0.7 }}>
                {past.map((o: any, i: number) => {
                  const sc = STATUS_COLORS[o.status] ?? STATUS_COLORS.delivered;
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < past.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{o.input_name}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{new Date(o.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.c }}>{o.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
