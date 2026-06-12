import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  blue: 'var(--color-sky)',
};

const FEATURES = [
  { icon: '📋', title: 'Loan Applications', desc: 'Members apply for short-term loans from the group pool with digital forms.' },
  { icon: '✅', title: 'Committee Approval', desc: 'Group leaders vote to approve or reject applications via the app.' },
  { icon: '📅', title: 'Repayment Schedules', desc: 'Automatic repayment tracking with SMS reminders before due dates.' },
  { icon: '📊', title: 'Credit Scoring', desc: 'Build member credit history based on repayment behaviour.' },
];

export default async function GroupLoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: loans } = await (supabase.from as any)('group_loans')
    .select('id, member_name, amount, purpose, status, repayment_date')
    .eq('admin_id', user.id)
    .order('status')
    .limit(20);

  const rows = (loans ?? []) as any[];
  const outstanding = rows.filter((l: any) => l.status === 'active').reduce((s: number, l: any) => s + (l.amount ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Loans 🤝</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Internal lending to help members bridge seasonal cash gaps</p>
      </div>

      {outstanding > 0 && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-sky-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Loans</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: C.blue, margin: 0, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UGX {outstanding.toLocaleString()}</p>
          </div>
          <span style={{ fontSize: 28 }}>🤝</span>
        </div>
      )}

      {rows.length > 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((l: any, i: number) => {
            const active = l.status === 'active';
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: C.blue, flexShrink: 0 }}>
                  {l.member_name?.[0]?.toUpperCase() ?? 'M'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{l.member_name ?? 'Member'}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{l.purpose ?? 'General'} · Due {l.repayment_date ? new Date(l.repayment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : 'TBD'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.blue, margin: '0 0 2px', letterSpacing: '-0.01em' }}>UGX {Math.round(l.amount ?? 0).toLocaleString()}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: active ? 'var(--color-sky-bg)' : 'var(--color-success-bg)', color: active ? C.blue : 'var(--color-success)' }}>{active ? 'Active' : 'Paid'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>🤝</div>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Group Loans Coming Soon</p>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Internal micro-lending between group members is on our roadmap. For now, record manual loans via Group Finance.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--d-bg)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{f.title}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/groups/finance/record" style={{ display: 'inline-block', marginTop: 20, padding: '10px 20px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Record a Loan Manually →
          </Link>
        </div>
      )}
    </div>
  );
}
