import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const TYPE_COLORS: Record<string, { c: string; bg: string }> = {
  contribution: { c: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
  expense:      { c: 'var(--color-danger)',    bg: 'var(--color-danger-bg)'  },
  loan:         { c: 'var(--color-sky)',       bg: 'var(--color-sky-bg)'     },
  income:       { c: 'var(--color-primary)',   bg: 'var(--color-primary-bg)' },
};

export default async function GroupFinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: records } = await (supabase.from as any)('group_finance')
    .select('id, type, amount, description, member_name, created_at')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (records ?? []) as any[];
  const totalIn = rows.filter((r: any) => r.type === 'contribution' || r.type === 'income').reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const totalOut = rows.filter((r: any) => r.type === 'expense').reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Finance 💰</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Track contributions, expenses, and group funds</p>
        </div>
        <Link href="/groups/finance/record" style={{ padding: '8px 16px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Record
        </Link>
      </div>

      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Balance', value: balance, color: balance >= 0 ? C.greenMed : 'var(--color-danger)' },
          { label: 'Total In', value: totalIn, color: 'var(--color-success)' },
          { label: 'Total Out', value: totalOut, color: 'var(--color-danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color, margin: 0, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {(value < 0 ? '-' : '')}UGX {Math.abs(value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>💰</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No records yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Start recording contributions, expenses, and income to track your group finances.</p>
          <Link href="/groups/finance/record" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Add First Record →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>Recent Transactions</p>
          </div>
          {rows.map((r: any, i: number) => {
            const tc = TYPE_COLORS[r.type] ?? TYPE_COLORS.contribution;
            const isOut = r.type === 'expense';
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: tc.bg, color: tc.c, flexShrink: 0, textTransform: 'capitalize' }}>{r.type}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{r.description ?? r.type}</p>
                  {r.member_name && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{r.member_name} · {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: isOut ? 'var(--color-danger)' : 'var(--color-success)', margin: 0, letterSpacing: '-0.01em' }}>
                  {isOut ? '-' : '+'}UGX {Math.round(r.amount ?? 0).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
