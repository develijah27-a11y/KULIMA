import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { Banknote, TrendingUp, CheckCircle2, AlertTriangle, Wallet, Calculator, ClipboardList, BarChart3, CalendarDays, Clock, Users } from 'lucide-react';
import type { JSX } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardBg: 'var(--d-card)', pageBg: 'var(--d-page)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

const CAT_COLORS: Record<string, string> = {
  seeds: 'var(--color-success)', fertilizer: 'var(--color-info)', pesticide: '#7C3AED',
  labor: 'var(--color-harvest)', land_prep: 'var(--color-harvest)', transport: 'var(--d-muted)',
  equipment: 'var(--d-muted)', irrigation: 'var(--color-sky)', storage: 'var(--color-harvest)', other: 'var(--d-muted)',
};

async function FinanceSummary({ userId }: { userId: string }) {
  const supabase = await getSupabase();
  const currentSeason = 'A2026';

  const [expensesRes, projectionRes, walletRes] = await Promise.all([
    (supabase.from as any)('farm_expenses')
      .select('amount_ugx, category, crop_type')
      .eq('user_id', userId)
      .eq('season', currentSeason),
    (supabase.from as any)('farm_projections')
      .select('projected_revenue_ugx, projected_profit_ugx, crop_type, area_ha')
      .eq('user_id', userId)
      .eq('season', currentSeason)
      .order('created_at', { ascending: false })
      .limit(3),
    (supabase.from as any)('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single(),
  ]);

  const expenses: any[] = expensesRes.data ?? [];
  const projections: any[] = projectionRes.data ?? [];

  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount_ugx), 0);
  const totalProjectedRevenue = projections.reduce((s: number, p: any) => s + Number(p.projected_revenue_ugx || 0), 0);
  const totalProjectedProfit = projections.reduce((s: number, p: any) => s + Number(p.projected_profit_ugx || 0), 0);
  const walletBalance = Number(walletRes.data?.balance ?? 0);

  const byCat: Record<string, number> = {};
  expenses.forEach((e: any) => {
    byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount_ugx);
  });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ROI = totalSpent > 0 && totalProjectedRevenue > 0
    ? Math.round(((totalProjectedRevenue - totalSpent) / totalSpent) * 100)
    : null;

  return (
    <>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {((): { label: string; value: string; sub: string; icon: JSX.Element; border: string; bg: string; color: string }[] => [
          {
            label: 'Total Invested (This Season)',
            value: totalSpent > 0 ? `UGX ${totalSpent.toLocaleString()}` : '—',
            sub: `${expenses.length} expense entries`,
            icon: <Banknote size={20} />, border: C.red, bg: 'var(--color-danger-bg)', color: C.red,
          },
          {
            label: 'Projected Revenue',
            value: totalProjectedRevenue > 0 ? `UGX ${totalProjectedRevenue.toLocaleString()}` : '—',
            sub: projections.length > 0 ? `${projections.length} plan${projections.length !== 1 ? 's' : ''}` : 'Run the calculator',
            icon: <TrendingUp size={20} />, border: C.green, bg: 'var(--color-primary-bg)', color: C.green,
          },
          {
            label: 'Projected Profit',
            value: totalProjectedProfit !== 0 ? `UGX ${Math.abs(totalProjectedProfit).toLocaleString()}` : '—',
            sub: ROI !== null ? `${ROI}% return on investment` : 'No projection yet',
            icon: totalProjectedProfit >= 0 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />,
            border: totalProjectedProfit >= 0 ? C.greenMed : C.amber,
            bg: totalProjectedProfit >= 0 ? 'var(--color-primary-bg)' : 'var(--color-harvest-bg)',
            color: totalProjectedProfit >= 0 ? C.greenMed : C.amber,
          },
          {
            label: 'Wallet Balance',
            value: `UGX ${walletBalance.toLocaleString()}`,
            sub: 'Available for farm inputs',
            icon: <Wallet size={20} />, border: C.blue, bg: 'var(--color-sky-bg)', color: C.blue,
          },
        ])().map(({ label, value, sub, icon, border, bg, color }) => (
          <div
            key={label}
            style={{
              background: C.cardBg, borderRadius: '12px', boxShadow: C.shadow,
              padding: '20px', borderTop: `3px solid ${border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: C.muted }}>{label}</p>
              <span style={{ display: 'flex', color }}>{icon}</span>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 900, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>{value}</p>
            <p style={{ fontSize: '12px', color }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Expense breakdown + projections side by side */}
      {(topCats.length > 0 || projections.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="md:grid-cols-2">

          {/* Expense categories */}
          {topCats.length > 0 && (
            <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.shadow }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Spending Breakdown</p>
                <p style={{ fontSize: '12px', color: C.muted }}>This Season · 2026 · UGX {totalSpent.toLocaleString()} total</p>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topCats.map(([cat, amount]) => {
                  const pct = Math.round((amount / totalSpent) * 100);
                  const color = CAT_COLORS[cat] ?? C.muted;
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>
                          {cat.replace(/_/g, ' ')}
                        </p>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
                            UGX {Math.round(amount).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '11px', color: C.muted, marginLeft: '6px' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/farmer/finance/expenses"
                  style={{ fontSize: '12px', fontWeight: 600, color: C.greenMed, textDecoration: 'none', marginTop: '4px' }}
                >
                  View all expenses →
                </Link>
              </div>
            </div>
          )}

          {/* Saved projections */}
          {projections.length > 0 && (
            <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.shadow }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Saved Farm Plans</p>
                <p style={{ fontSize: '12px', color: C.muted }}>This Season · 2026</p>
              </div>
              <div style={{ padding: '0' }}>
                {projections.map((p: any, i: number) => {
                  const profit = Number(p.projected_profit_ugx ?? 0);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '14px 20px', borderBottom: i < projections.length - 1 ? `1px solid ${C.border}` : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>
                          {p.crop_type?.replace(/_/g, ' ')} · {p.area_ha} ha
                        </p>
                        <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                          Revenue: UGX {Number(p.projected_revenue_ugx || 0).toLocaleString()}
                        </p>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: profit >= 0 ? C.greenMed : C.red }}>
                        {profit >= 0 ? '+' : ''}UGX {Math.abs(profit).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default async function FinancePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');
  const user = session.user;

  const actions = [
    {
      href: '/farmer/finance/calculator',
      icon: <Calculator size={28} />, title: 'Profitability Calculator',
      desc: 'Calculate expected yield, costs & profit for any crop and farm size',
      color: C.green, bg: 'var(--color-primary-bg)', border: 'var(--color-primary-muted)',
    },
    {
      href: '/farmer/finance/expenses',
      icon: <ClipboardList size={28} />, title: 'Expense Tracker',
      desc: 'Log fertilizer, seed, labor and other costs as you spend',
      color: C.blue, bg: 'var(--color-sky-bg)', border: 'var(--color-sky)',
    },
    {
      href: '/farmer/prices',
      icon: <BarChart3 size={28} />, title: 'Live Market Prices',
      desc: 'Check current buying prices across all districts before selling',
      color: C.amber, bg: 'var(--color-harvest-bg)', border: 'var(--color-warning-border)',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Farm Finance
        </h1>
        <p style={{ fontSize: '13px', color: C.muted }}>
          Track costs, project profits, and price your harvest for maximum return
        </p>
      </div>

      {/* Quick action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {actions.map(({ href, icon, title, desc, color, bg, border }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'block', background: bg, borderRadius: '14px',
              border: `1.5px solid ${border}`, padding: '20px',
              textDecoration: 'none', transition: 'transform 0.1s',
            }}
          >
            <span style={{ display: 'flex', marginBottom: '12px', color }}>{icon}</span>
            <p style={{ fontSize: '15px', fontWeight: 800, color, marginBottom: '6px' }}>{title}</p>
            <p style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5' }}>{desc}</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color, marginTop: '12px' }}>Open →</p>
          </Link>
        ))}
      </div>

      {/* Live summary */}
      <Suspense fallback={
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
        </div>
      }>
        <FinanceSummary userId={user.id} />
      </Suspense>

      {/* Tips banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: '16px', padding: '24px',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#BBF7D0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Profit Tips
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { icon: <CalendarDays size={18} />, tip: 'Track every cost from day one — most farmers underestimate total input costs by 30%.' },
            { icon: <Clock size={18} />, tip: 'Storing maize 2–3 months post-harvest can increase price by UGX 150–300/kg.' },
            { icon: <Users size={18} />, tip: 'Group selling with neighbors reduces transport cost per kg by up to 40%.' },
            { icon: <TrendingUp size={18} />, tip: 'Always calculate your break-even price before accepting any buyer\'s offer.' },
          ].map(({ icon, tip }) => (
            <div key={tip} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ display: 'flex', flexShrink: 0, color: 'rgba(255,255,255,0.75)' }}>{icon}</span>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
