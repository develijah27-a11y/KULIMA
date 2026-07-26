import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, ...style }}>{children}</div>
);

function fmt(n: number) {
  if (n >= 1e9) return `UGX ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `UGX ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `UGX ${(n / 1e3).toFixed(0)}K`;
  return `UGX ${Math.round(n).toLocaleString()}`;
}

async function RevenueKPIs() {
  const supabase = await createClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const [feesAllRes, feesMonthRes, feesTodayRes, escrowAllRes, walletTvlRes] = await Promise.all([
    (supabase.from as any)('wallet_transactions').select('amount').eq('type', 'fee'),
    (supabase.from as any)('wallet_transactions').select('amount').eq('type', 'fee').gte('created_at', monthStart),
    (supabase.from as any)('wallet_transactions').select('amount').eq('type', 'fee').gte('created_at', todayStart.toISOString()),
    (supabase.from as any)('escrow_accounts').select('amount').eq('status', 'funded'),
    (supabase.from as any)('wallets').select('balance'),
  ]);

  const sum = (rows: any[]) => (rows ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? r.balance ?? 0), 0);

  const totalFees   = sum(feesAllRes.data   ?? []);
  const monthFees   = sum(feesMonthRes.data ?? []);
  const todayFees   = sum(feesTodayRes.data ?? []);
  const escrowHeld  = sum(escrowAllRes.data ?? []);
  const tvl         = sum(walletTvlRes.data ?? []);

  const kpis = [
    { label: 'Revenue All-Time',  value: fmt(totalFees),  sub: 'Platform commissions',   color: C.green,   border: C.green },
    { label: 'Revenue This Month',value: fmt(monthFees),  sub: 'Current month',           color: C.greenMed,border: C.greenMed },
    { label: 'Revenue Today',     value: fmt(todayFees),  sub: "Today's fees",            color: C.amber,   border: C.amber },
    { label: 'Escrow Held',       value: fmt(escrowHeld), sub: 'Awaiting deal completion',color: C.blue,    border: C.blue },
    { label: 'Total Value Locked',value: fmt(tvl),        sub: 'All user wallets',        color: C.muted,   border: C.muted },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map(({ label, value, sub, color, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '16px 18px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, margin: '0 0 8px' }}>{label}</p>
          <p style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.03em', margin: '0 0 2px' }}>{value}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

async function FeeBreakdown() {
  const supabase = await createClient();
  const { data: fees } = await (supabase.from as any)('wallet_transactions')
    .select('amount, description, created_at')
    .eq('type', 'fee')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows: any[] = fees ?? [];
  const byDesc: Record<string, number> = {};
  rows.forEach(r => { const k = r.description ?? 'Other'; byDesc[k] = (byDesc[k] ?? 0) + Number(r.amount); });
  const sorted = Object.entries(byDesc).sort((a,b) => b[1] - a[1]).slice(0, 8);
  const total = sorted.reduce((s, [,v]) => s + v, 0) || 1;

  // 30-day daily fees
  const daily: Record<string,number> = {};
  rows.forEach(r => { const k = r.created_at?.slice(0,10); if(k) daily[k] = (daily[k]??0)+Number(r.amount); });
  const last30 = [...Array(30)].map((_,i)=>{
    const d = new Date(Date.now()-i*864e5); const k = d.toISOString().slice(0,10);
    return { k, v: daily[k]??0, label: d.toLocaleDateString('en-UG',{day:'numeric',month:'short'}) };
  }).reverse();
  const maxDay = Math.max(...last30.map(d=>d.v),1);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card>
        <div className="px-5 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
          <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Revenue by Source</p>
          <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>Platform fees by transaction description</p>
        </div>
        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center"><p style={{color:C.muted,fontSize:13}}>No fee data yet</p></div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {sorted.map(([desc, amount]) => (
              <div key={desc}>
                <div className="flex justify-between mb-1">
                  <span style={{fontSize:12,color:C.text,fontWeight:600}}>{desc}</span>
                  <span style={{fontSize:12,fontWeight:800,color:C.greenMed}}>{fmt(amount)}</span>
                </div>
                <div style={{height:5,background:'var(--color-surface-2)',borderRadius:999}}>
                  <div style={{height:5,width:`${Math.round((amount/total)*100)}%`,background:C.greenMed,borderRadius:999}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div className="px-5 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
          <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Daily Revenue — 30 Days</p>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-end gap-0.5 h-20">
            {last30.map(({k,v})=>(
              <div key={k} title={`${fmt(v)}`} style={{flex:1,display:'flex',alignItems:'flex-end'}}>
                <div style={{width:'100%',minHeight:2,height:`${Math.round((v/maxDay)*72)+2}px`,background:v>0?C.green:'var(--color-surface-2)',borderRadius:'2px 2px 0 0'}}/>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span style={{fontSize:9,color:C.muted}}>{last30[0].label}</span>
            <span style={{fontSize:9,color:C.muted}}>{last30[29].label}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

async function RecentFeeTransactions() {
  const supabase = await createClient();
  const { data: txns } = await (supabase.from as any)('wallet_transactions')
    .select('id, amount, description, reference, status, created_at')
    .eq('type', 'fee')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
        <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Recent Fee Collections</p>
      </div>
      {(txns ?? []).length === 0 ? (
        <div className="px-5 py-8 text-center"><p style={{color:C.muted,fontSize:13}}>No fee transactions yet</p></div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{background:'var(--color-surface-2)'}}>
                {['Description','Reference','Amount','Status','Date'].map(h=>(
                  <th key={h} style={{padding:'8px 16px',textAlign:'left',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:C.muted}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(txns ?? []).map((t:any)=>(
                <tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'10px 16px',color:C.text,fontWeight:600}}>{t.description ?? '—'}</td>
                  <td style={{padding:'10px 16px',color:C.muted,fontFamily:'monospace'}}>{t.reference?.slice(0,16) ?? '—'}</td>
                  <td style={{padding:'10px 16px',color:C.green,fontWeight:800}}>{fmt(Number(t.amount))}</td>
                  <td style={{padding:'10px 16px'}}>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:t.status==='completed'?'var(--color-success-bg)':'var(--color-harvest-bg)',color:t.status==='completed'?'var(--color-success)':C.amber}}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{padding:'10px 16px',color:C.muted}}>{new Date(t.created_at).toLocaleDateString('en-UG',{day:'numeric',month:'short'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default async function AdminRevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((p as any)?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0, fontFamily:"'Poppins','Inter',system-ui,sans-serif" }}>Revenue Analytics</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Platform commissions, escrow flow, and fee breakdown</p>
      </div>
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[1,2,3,4,5].map(i=><div key={i} className="dash-skeleton h-24 rounded-xl"/>)}</div>}>
        <RevenueKPIs />
      </Suspense>
      <Suspense fallback={<div className="grid lg:grid-cols-2 gap-5">{[1,2].map(i=><div key={i} className="dash-skeleton h-48 rounded-xl"/>)}</div>}>
        <FeeBreakdown />
      </Suspense>
      <Suspense fallback={<div className="dash-skeleton h-64 rounded-xl"/>}>
        <RecentFeeTransactions />
      </Suspense>
    </div>
  );
}
