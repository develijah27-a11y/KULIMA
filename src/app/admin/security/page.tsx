import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, Lock, Eye, AlertTriangle, UserX, KeyRound } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, ...style }}>{children}</div>
);

async function SecurityKPIs() {
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 24*3600*1000).toISOString();
  const weekAgo = new Date(Date.now() - 7*864e5).toISOString();

  const [authFailDay, authFailWeek, fraudDay, frozenWallets, pendingKyc, passwordResets] = await Promise.all([
    (supabase.from as any)('system_logs').select('id',{count:'exact',head:true}).eq('category','auth_failure').gte('created_at',dayAgo),
    (supabase.from as any)('system_logs').select('id',{count:'exact',head:true}).eq('category','auth_failure').gte('created_at',weekAgo),
    (supabase.from as any)('fraud_flags').select('id',{count:'exact',head:true}).gte('created_at',dayAgo),
    (supabase.from as any)('wallets').select('id',{count:'exact',head:true}).eq('is_frozen',true),
    (supabase.from as any)('verifications').select('id',{count:'exact',head:true}).eq('status','pending'),
    (supabase.from as any)('system_logs').select('id',{count:'exact',head:true}).ilike('message','%password reset%'),
  ]);

  const kpis = [
    { label: 'Auth Failures (24h)',  value: authFailDay.count  ?? 0, icon: <ShieldAlert size={18}/>, color: C.red,    border: C.red,   alert: (authFailDay.count ?? 0) > 10 },
    { label: 'Auth Failures (7d)',   value: authFailWeek.count ?? 0, icon: <Lock size={18}/>,        color: C.amber,  border: C.amber  },
    { label: 'Fraud Flags (24h)',    value: fraudDay.count     ?? 0, icon: <AlertTriangle size={18}/>,color: C.red,   border: C.red,   alert: (fraudDay.count ?? 0) > 0 },
    { label: 'Frozen Wallets',       value: frozenWallets.count?? 0, icon: <Eye size={18}/>,          color: C.blue,  border: C.blue   },
    { label: 'Pending KYC',          value: pendingKyc.count   ?? 0, icon: <UserX size={18}/>,        color: C.amber, border: C.amber  },
    { label: 'Password Resets (log)',value: passwordResets.count??0, icon: <KeyRound size={18}/>,     color: C.muted, border: C.muted  },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map(({ label, value, icon, color, border, alert }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '16px 16px', position:'relative' }}>
          {alert && <div style={{ position:'absolute', top:10, right:10, width:8, height:8, borderRadius:'50%', background:C.red, boxShadow:`0 0 0 3px rgba(230,57,70,0.2)` }}/>}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ color }}>{icon}</span>
            <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted, margin:0 }}>{label}</p>
          </div>
          <p style={{ fontSize:24, fontWeight:900, color, letterSpacing:'-0.03em', margin:0 }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

async function RecentAuthFailures() {
  const supabase = await createClient();
  const { data: logs, error } = await (supabase.from as any)('system_logs')
    .select('id, route, message, metadata, created_at')
    .eq('category', 'auth_failure')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) return (
    <Card><div style={{padding:'24px 20px',textAlign:'center'}}><p style={{color:C.muted,fontSize:13}}>Auth failure logs require the system_logs migration.</p></div></Card>
  );

  return (
    <Card>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
        <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Recent Auth Failures</p>
        <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>Failed login attempts and session errors</p>
      </div>
      {(logs??[]).length === 0 ? (
        <div style={{padding:'32px 20px',textAlign:'center'}}><p style={{color:C.muted,fontSize:13}}>No auth failures recorded</p></div>
      ) : (
        <div>
          {(logs??[]).map((log:any)=>(
            <div key={log.id} style={{ padding:'10px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.text, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.message}</p>
                <p style={{ fontSize:10, color:C.muted, margin:0, fontFamily:'monospace' }}>{log.route ?? '—'}</p>
              </div>
              <p style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{new Date(log.created_at).toLocaleString('en-UG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

async function FraudFlags() {
  const supabase = await createClient();
  const { data: flags, error } = await (supabase.from as any)('fraud_flags')
    .select('id, flagged_user_id, reason, severity, status, created_at, profile:profiles!fraud_flags_flagged_user_id_fkey(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(20);

  const SEV: Record<string,{color:string;bg:string}> = {
    low:    { color:'var(--color-harvest)', bg:'var(--color-harvest-bg)' },
    medium: { color:'var(--color-warning)', bg:'var(--color-warning-bg)' },
    high:   { color:C.red,                 bg:'var(--color-danger-bg)'  },
  };

  return (
    <Card>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Fraud Flags</p>
          <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>Suspicious activity reports</p>
        </div>
        <a href="/admin/fraud" style={{ fontSize:12, fontWeight:700, color:C.greenMed, textDecoration:'none' }}>Manage →</a>
      </div>
      {error || (flags??[]).length === 0 ? (
        <div style={{padding:'32px 20px',textAlign:'center'}}><p style={{color:C.muted,fontSize:13}}>{error ? 'Fraud flags table not found' : 'No active fraud flags'}</p></div>
      ) : (
        <div>
          {(flags??[]).map((f:any)=>{
            const sev = SEV[f.severity] ?? SEV.medium;
            const profile = Array.isArray(f.profile) ? f.profile[0] : f.profile;
            return (
              <div key={f.id} style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.text, margin:0 }}>{profile?.full_name ?? 'Unknown'}</p>
                    <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, background:sev.bg, color:sev.color, textTransform:'uppercase' }}>{f.severity}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'var(--color-surface-2)', color:C.muted, textTransform:'capitalize' }}>{f.status}</span>
                  </div>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{f.reason}</p>
                </div>
                <p style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{new Date(f.created_at).toLocaleDateString('en-UG',{day:'numeric',month:'short'})}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default async function AdminSecurityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((p as any)?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0, fontFamily:"'Poppins','Inter',system-ui,sans-serif" }}>Security Dashboard</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Auth failures, fraud flags, frozen accounts, and KYC status</p>
      </div>
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className="dash-skeleton h-24 rounded-xl"/>)}</div>}>
        <SecurityKPIs />
      </Suspense>
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl"/>}><RecentAuthFailures /></Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl"/>}><FraudFlags /></Suspense>
      </div>
    </div>
  );
}
