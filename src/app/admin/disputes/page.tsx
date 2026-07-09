import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DisputeActions } from './DisputeActions';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  red: 'var(--color-danger)', amber: 'var(--color-harvest)', blue: 'var(--color-sky)',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:         { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Open'         },
  under_review: { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Under Review' },
  resolved:     { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Resolved'     },
  closed:       { color: 'var(--d-muted)',        bg: 'var(--color-surface-2)',  label: 'Closed'       },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

async function DisputeStats() {
  const supabase = await createClient();
  const [openRes, reviewRes, resolvedRes] = await Promise.allSettled([
    (supabase.from as any)('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    (supabase.from as any)('disputes').select('id', { count: 'exact', head: true }).eq('status', 'under_review'),
    (supabase.from as any)('disputes').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
  ]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Open',         value: openRes.status     === 'fulfilled' ? (openRes.value.count     ?? 0) : 0, color: C.red      },
        { label: 'Under Review', value: reviewRes.status   === 'fulfilled' ? (reviewRes.value.count   ?? 0) : 0, color: C.amber    },
        { label: 'Resolved',     value: resolvedRes.status === 'fulfilled' ? (resolvedRes.value.count ?? 0) : 0, color: C.greenMed },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '16px 18px' }}>
          <p style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-0.03em', margin: '0 0 4px' }}>{value}</p>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: 0 }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

async function DisputeList({ status }: { status: string }) {
  const supabase = await createClient();

  let q = (supabase.from as any)('disputes')
    .select('id, status, reason, description, resolution, created_at, complainant_id, respondent_id, order_id')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);

  const { data: disputes, error } = await q;

  let rows: any[] = disputes ?? [];
  if (error && error.message?.includes('column')) {
    const fallback = await (supabase.from as any)('disputes')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    rows = fallback.data ?? [];
  }

  const userIds = [...new Set([
    ...rows.map((r: any) => r.complainant_id),
    ...rows.map((r: any) => r.respondent_id),
  ].filter(Boolean) as string[])];

  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await (supabase.from as any)('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name ?? 'Unknown'; });
  }

  if (error && !error.message?.includes('column')) {
    return (
      <div style={{ background: 'var(--color-danger-bg)', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ color: C.red, fontSize: 13 }}>
          Could not load disputes. Run migration <code>20260614000002_disputes_fraud.sql</code> to create the table.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21H17"/><path d="M12 3v18"/><path d="M3 7h2c2 0 4-1 6-2 2 1 4 2 6 2h2"/></svg></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No disputes</p>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {status ? 'No disputes with this status.' : 'All transactions are going smoothly.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
      {rows.map((d: any, i: number) => {
        const st = STATUS_CFG[d.status] ?? STATUS_CFG.open;
        return (
          <div key={d.id} style={{ padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  <p style={{ fontSize: 10, color: C.muted, margin: 0, fontFamily: 'monospace' }}>#{d.id?.slice(0, 8)}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>
                  {d.reason?.replace(/_/g, ' ') ?? 'General dispute'}
                </p>
                {d.description && (
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>{d.description}</p>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {d.complainant_id && (
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                      {nameMap[d.complainant_id] ?? d.complainant_id.slice(0, 8)}
                    </p>
                  )}
                  {d.respondent_id && (
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                      vs {nameMap[d.respondent_id] ?? d.respondent_id.slice(0, 8)}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{timeAgo(d.created_at)}</p>
                </div>
                {d.resolution && (
                  <p style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{d.resolution}</p>
                )}
              </div>
              <DisputeActions disputeId={d.id} currentStatus={d.status} orderId={d.order_id ?? null} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/dashboard');

  const { status = '' } = await searchParams;
  const statusTabs = ['', 'open', 'under_review', 'resolved', 'closed'];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Dispute Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Transaction disputes and conflict resolution</p>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-16 rounded-xl" />)}
        </div>
      }>
        <DisputeStats />
      </Suspense>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {statusTabs.map(s => (
          <a key={s || 'all'} href={s ? `?status=${s}` : '/admin/disputes'}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              textDecoration: 'none', textTransform: 'capitalize',
              background: status === s ? C.green : 'var(--color-surface-2)',
              color: status === s ? '#fff' : C.muted,
            }}>
            {s ? s.replace('_', ' ') : 'All'}
          </a>
        ))}
      </div>

      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
        <DisputeList status={status} />
      </Suspense>
    </div>
  );
}
