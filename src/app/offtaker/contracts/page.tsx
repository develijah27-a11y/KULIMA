import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', blue: 'var(--color-sky)',
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  pending:   { label: 'Pending',   color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  completed: { label: 'Done',      color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

const CROP_EMOJI: Record<string, string> = { maize: '🌽', coffee: '☕', beans: '🫘', banana: '🍌', cassava: '🥔', tomato: '🍅', rice: '🌾', cotton: '🌾' };

export default async function OfftakerContractsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, farmer_name, district, delivery_date, status, payment_status, created_at')
    .eq('offtaker_id', user.id)
    .order('delivery_date', { ascending: true })
    .limit(50);

  const rows = (contracts ?? []) as any[];
  const active = rows.filter((c: any) => c.status === 'active');
  const other = rows.filter((c: any) => c.status !== 'active');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Contracts 📄</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{rows.length} contract{rows.length !== 1 ? 's' : ''} · {active.length} active</p>
        </div>
        <Link href="/offtaker/pipeline/new" style={{ padding: '8px 16px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New Contract
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📄</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No contracts yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Create forward contracts with farmers to secure your supply.</p>
          <Link href="/offtaker/pipeline" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Browse Listings →
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active Contracts</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {active.map((c: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(c.delivery_date).getTime() - Date.now()) / 864e5);
                  return (
                    <div key={c.id} style={{ padding: '16px 20px', borderBottom: i < active.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌾'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{c.crop_type} · {(c.quantity_kg ?? 0).toLocaleString()} kg</p>
                        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{c.farmer_name ?? c.district} · Delivery {new Date(c.delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 2px' }}>UGX {Math.round(c.price_ugx ?? 0).toLocaleString()}</p>
                        {daysLeft <= 7 && daysLeft >= 0 && <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, margin: 0 }}>⏰ {daysLeft}d left</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Past Contracts</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {other.map((c: any, i: number) => {
                  const st = STATUS[c.status] ?? STATUS.pending;
                  return (
                    <div key={c.id} style={{ padding: '14px 20px', borderBottom: i < other.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14, opacity: 0.7 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌾'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{c.crop_type} · {c.district}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{new Date(c.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
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
