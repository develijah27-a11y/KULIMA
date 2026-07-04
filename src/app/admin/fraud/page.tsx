import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FraudActions } from './FraudActions';

const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green:      'var(--color-primary)',
  greenMed:   'var(--color-primary-hover)',
  red:        'var(--color-danger)',
  amber:      'var(--color-harvest)',
};

const SEV_CFG: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Low'      },
  medium:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Medium'   },
  high:     { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'High'     },
  critical: { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Critical' },
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:          { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Open'          },
  investigating: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Investigating' },
  resolved:      { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Resolved'      },
  dismissed:     { color: 'var(--d-muted)',        bg: 'var(--color-surface-2)',  label: 'Dismissed'     },
};

async function FraudStats() {
  const supabase = await createClient();
  const [totalRes, openRes, highRes] = await Promise.allSettled([
    (supabase.from as any)('fraud_flags').select('id', { count: 'exact', head: true }),
    (supabase.from as any)('fraud_flags').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    (supabase.from as any)('fraud_flags').select('id', { count: 'exact', head: true }).in('severity', ['high', 'critical']),
  ]);

  const counts = {
    total: totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0,
    open:  openRes.status  === 'fulfilled' ? (openRes.value.count  ?? 0) : 0,
    high:  highRes.status  === 'fulfilled' ? (highRes.value.count  ?? 0) : 0,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Flags',     value: counts.total, color: C.text   },
        { label: 'Open Cases',      value: counts.open,  color: C.red    },
        { label: 'High / Critical', value: counts.high,  color: 'var(--color-primary-hover)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '16px 18px' }}>
          <p style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-0.03em', margin: '0 0 4px' }}>{value}</p>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: 0 }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

async function FlagList({ status, sev }: { status: string; sev: string }) {
  const supabase = await createClient();
  let q = (supabase.from as any)('fraud_flags')
    .select('id, user_id, flagged_by, reason, severity, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  if (sev)    q = q.eq('severity', sev);

  const { data: flags, error } = await q;
  const rows: any[] = flags ?? [];

  if (error) {
    return (
      <div style={{ background: 'var(--color-danger-bg)', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ color: C.red, fontSize: 13 }}>
          Could not load fraud flags. Run migration <code>20260614000002_disputes_fraud.sql</code> to create the table.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No fraud flags</p>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {status || sev ? 'Try a different filter.' : 'The platform looks clean.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
      {rows.map((flag: any, i: number) => {
        const svc  = SEV_CFG[flag.severity]  ?? SEV_CFG.low;
        const stc  = STATUS_CFG[flag.status] ?? STATUS_CFG.open;
        return (
          <div key={flag.id} style={{ padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: svc.bg, color: svc.color }}>{svc.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: stc.bg, color: stc.color }}>{stc.label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>
                  {flag.reason?.replace(/_/g, ' ') ?? 'Unknown reason'}
                </p>
                {flag.description && (
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>{flag.description}</p>
                )}
                <p style={{ fontSize: 10, color: C.muted, margin: 0, fontFamily: 'monospace' }}>
                  User: {flag.user_id?.slice(0, 18)}… ·{' '}
                  {new Date(flag.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <FraudActions flagId={flag.id} currentStatus={flag.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminFraudPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sev?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/dashboard');

  const { status = '', sev = '' } = await searchParams;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Fraud Flags
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Suspicious activity reports and fraud investigations</p>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-16 rounded-xl" />)}
        </div>
      }>
        <FraudStats />
      </Suspense>

      <form method="GET" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="status" defaultValue={status}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="sev" defaultValue={sev}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Severities</option>
          {Object.entries(SEV_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filter
        </button>
      </form>

      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
        <FlagList status={status} sev={sev} />
      </Suspense>
    </div>
  );
}
