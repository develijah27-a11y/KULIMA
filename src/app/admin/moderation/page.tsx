import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Flag, Package, User, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, ...style }}>{children}</div>
);

async function ModerationKPIs() {
  const supabase = await createClient();
  const [reportedListings, fraudFlags, pendingKyc, disputes] = await Promise.all([
    (supabase.from as any)('listings').select('id',{count:'exact',head:true}).eq('is_reported', true),
    (supabase.from as any)('fraud_flags').select('id',{count:'exact',head:true}).eq('status','open'),
    (supabase.from as any)('verifications').select('id',{count:'exact',head:true}).eq('status','pending'),
    (supabase.from as any)('disputes').select('id',{count:'exact',head:true}).eq('status','open'),
  ]);

  const kpis = [
    { label: 'Reported Listings', value: reportedListings.count ?? 0, icon: <Package size={18}/>,       color: C.red,    border: C.red,   href: '/admin/listings'    },
    { label: 'Open Fraud Flags',  value: fraudFlags.count     ?? 0,   icon: <AlertTriangle size={18}/>, color: C.amber,  border: C.amber, href: '/admin/fraud'       },
    { label: 'Pending KYC',       value: pendingKyc.count     ?? 0,   icon: <User size={18}/>,           color: C.blue,   border: C.blue,  href: '/admin/verification'},
    { label: 'Open Disputes',     value: disputes.count       ?? 0,   icon: <Flag size={18}/>,           color: C.red,    border: C.red,   href: '/admin/disputes'    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, icon, color, border, href }) => (
        <a key={label} href={href} style={{ textDecoration:'none' }}>
          <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '16px 18px', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted, margin:0 }}>{label}</p>
              <span style={{ color }}>{icon}</span>
            </div>
            <p style={{ fontSize:26, fontWeight:900, color, letterSpacing:'-0.03em', margin:0 }}>{value}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

async function ReportedListings() {
  const supabase = await createClient();
  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, status, created_at')
    .eq('is_reported', true)
    .order('created_at', { ascending: false })
    .limit(15);

  return (
    <Card>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Reported Listings</p>
          <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>Flagged by users as fake or fraudulent</p>
        </div>
        <a href="/admin/listings" style={{ fontSize:12, fontWeight:700, color:C.greenMed, textDecoration:'none' }}>Manage all →</a>
      </div>
      {(listings ?? []).length === 0 ? (
        <div style={{padding:'32px 20px',textAlign:'center'}}>
          <CheckCircle2 size={28} style={{margin:'0 auto 8px',color:'var(--color-success)'}}/>
          <p style={{color:C.muted,fontSize:13}}>No reported listings</p>
        </div>
      ) : (
        <div>
          {(listings??[]).map((l:any)=>(
            <div key={l.id} style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'var(--color-danger-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Flag size={16} style={{color:C.red}}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.text, margin:'0 0 2px', textTransform:'capitalize' }}>{l.crop_type} — {l.quantity_kg?.toLocaleString()} kg</p>
                <p style={{ fontSize:11, color:C.muted, margin:0 }}>{l.district} · UGX {Math.round(l.asking_price ?? 0).toLocaleString()}/kg</p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'var(--color-danger-bg)', color:C.red }}>Reported</span>
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'var(--color-surface-2)', color:C.muted, textTransform:'capitalize' }}>{l.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

async function OpenDisputes() {
  const supabase = await createClient();
  const { data: disputes } = await (supabase.from as any)('disputes')
    .select('id, dispute_type, status, description, created_at, reporter:profiles!disputes_reporter_id_fkey(full_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(15);

  const STATUS: Record<string,{color:string;bg:string}> = {
    open:        { color: C.red,    bg: 'var(--color-danger-bg)'  },
    in_review:   { color: C.amber,  bg: 'var(--color-harvest-bg)' },
    resolved:    { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  };

  return (
    <Card>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:800, color:C.text, margin:0 }}>Open Disputes</p>
          <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>User-raised transaction and delivery disputes</p>
        </div>
        <a href="/admin/disputes" style={{ fontSize:12, fontWeight:700, color:C.greenMed, textDecoration:'none' }}>Manage all →</a>
      </div>
      {(disputes ?? []).length === 0 ? (
        <div style={{padding:'32px 20px',textAlign:'center'}}>
          <CheckCircle2 size={28} style={{margin:'0 auto 8px',color:'var(--color-success)'}}/>
          <p style={{color:C.muted,fontSize:13}}>No open disputes</p>
        </div>
      ) : (
        <div>
          {(disputes??[]).map((d:any)=>{
            const st = STATUS[d.status] ?? STATUS.open;
            const reporter = Array.isArray(d.reporter) ? d.reporter[0] : d.reporter;
            return (
              <div key={d.id} style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:st.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock size={16} style={{color:st.color}}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.text, margin:0, textTransform:'capitalize' }}>{d.dispute_type?.replace(/_/g,' ') ?? 'Dispute'}</p>
                    <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, background:st.bg, color:st.color, textTransform:'uppercase' }}>{d.status}</span>
                  </div>
                  <p style={{ fontSize:11, color:C.muted, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.description}</p>
                  <p style={{ fontSize:10, color:C.muted, margin:0 }}>By {reporter?.full_name ?? 'Unknown'} · {new Date(d.created_at).toLocaleDateString('en-UG',{day:'numeric',month:'short'})}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default async function AdminModerationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((p as any)?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0, fontFamily:"'Poppins','Inter',system-ui,sans-serif" }}>Content Moderation</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Reported listings, open disputes, fraud flags, and pending KYC</p>
      </div>
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="dash-skeleton h-24 rounded-xl"/>)}</div>}>
        <ModerationKPIs />
      </Suspense>
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl"/>}><ReportedListings /></Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl"/>}><OpenDisputes /></Suspense>
      </div>
    </div>
  );
}
