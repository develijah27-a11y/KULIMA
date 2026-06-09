import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { ExpenseForm } from './ExpenseForm';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: '#1B4332', greenMed: '#40916C',
  cardBg: 'var(--d-card)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

// Streams in after the shell — fetches all expenses from DB
async function ExpenseData({ userId }: { userId: string }) {
  const supabase = await getSupabase();
  const { data } = await (supabase.from as any)('farm_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false });

  const expenses = (data ?? []) as any[];
  const current = expenses.filter((e: any) => e.season === 'A2026');
  const totalSpent = current.reduce((s: number, e: any) => s + Number(e.amount_ugx), 0);
  const byCat: Record<string, number> = {};
  current.forEach((e: any) => { byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount_ugx); });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      {totalSpent > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {[
            {
              label: 'Total Spent (Season A)',
              value: `UGX ${totalSpent.toLocaleString()}`,
              sub: `${current.length} expense entries`,
              color: '#E63946', bg: '#FEF2F2',
            },
            {
              label: 'Biggest Category',
              value: topCat ? topCat[0].replace(/_/g, ' ') : '—',
              sub: topCat ? `UGX ${Math.round(topCat[1]).toLocaleString()}` : '',
              color: C.greenMed, bg: '#F0FDF4',
            },
            {
              label: 'Avg per Entry',
              value: current.length > 0 ? `UGX ${Math.round(totalSpent / current.length).toLocaleString()}` : '—',
              sub: 'per expense logged',
              color: '#0077B6', bg: '#EFF6FF',
            },
          ].map(({ label, value, sub, color, bg }) => (
            <div
              key={label}
              style={{ background: bg, borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${color}` }}
            >
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, color: C.text, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{value}</p>
              <p style={{ fontSize: '11px', color, marginTop: '2px' }}>{sub}</p>
            </div>
          ))}
        </div>
      )}
      <ExpenseForm initialExpenses={expenses} />
    </>
  );
}

function StatsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
      {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}
    </div>
  );
}

export default async function ExpensesPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.muted }}>
        <Link href="/farmer/finance" style={{ color: C.muted, textDecoration: 'none' }}>Farm Finance</Link>
        <span>/</span>
        <span style={{ color: C.text, fontWeight: 600 }}>Expense Tracker</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Expense Tracker
          </h1>
          <p style={{ fontSize: '13px', color: C.muted }}>
            Log every farm cost — seeds, fertilizer, labor, transport, and more
          </p>
        </div>
        <Link
          href="/farmer/finance/calculator"
          style={{
            padding: '10px 18px', borderRadius: '10px',
            background: '#F0FDF4', border: `1.5px solid #A7F3D0`,
            color: C.green, fontSize: '13px', fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          🧮 Open Calculator
        </Link>
      </div>

      {/* Stats + list stream in — header is already visible */}
      <Suspense fallback={<StatsSkeleton />}>
        <ExpenseData userId={session.user.id} />
      </Suspense>

    </div>
  );
}
