import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClipboardList } from 'lucide-react';

const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green:      'var(--color-primary)',
  greenMed:   'var(--color-primary-hover)',
  red:        'var(--color-danger)',
  blue:       'var(--color-sky)',
};

const ACTION_CFG: Record<string, { color: string; bg: string }> = {
  create:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  update:  { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
  delete:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  approve: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  reject:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  resolve: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  dismiss: { color: 'var(--d-muted)',        bg: 'var(--color-surface-2)'  },
  login:   { color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  suspend: { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
};

const RESOURCE_TYPES = [
  'profiles', 'listings', 'offers', 'verifications',
  'delivery_requests', 'disputes', 'fraud_flags',
  'wallets', 'farm_inventory',
];

const PAGE_SIZE = 50;

async function LogsList({
  action, resource, page,
}: {
  action: string; resource: string; page: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let q = (supabase.from as any)('audit_logs')
    .select('id, user_id, action, resource_type, resource_id, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (action)   q = q.eq('action', action);
  if (resource) q = q.eq('resource_type', resource);

  const { data: logs, count, error } = await q;
  const rows: any[] = logs ?? [];
  const total      = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean) as string[])];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await (supabase.from as any)('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name ?? 'Unknown'; });
  }

  function filterHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ action, resource, page: '1', ...overrides });
    if (!p.get('action'))   p.delete('action');
    if (!p.get('resource')) p.delete('resource');
    return `/admin/audit-logs?${p}`;
  }

  if (error) {
    return (
      <div style={{ background: 'var(--color-danger-bg)', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ color: C.red, fontSize: 13 }}>
          Could not load audit logs. Run migration <code>20260615000001_audit_logs.sql</code> to create the table.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><ClipboardList size={48} /></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No logs found</p>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {action || resource ? 'Try a different filter.' : 'Audit events are logged automatically as users take actions.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        <div className="hidden sm:grid px-5 py-3" style={{ gridTemplateColumns: '90px 140px 1fr 180px 90px', gap: 12, borderBottom: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
          {['Action', 'Resource', 'Actor', 'Details', 'Time'].map(h => (
            <p key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, margin: 0 }}>{h}</p>
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((log: any) => {
            const cfg = ACTION_CFG[log.action] ?? { color: C.muted, bg: 'var(--color-surface-2)' };
            const actorName = log.user_id ? (nameMap[log.user_id] ?? log.user_id.slice(0, 10) + '…') : 'system';
            const metaStr = log.metadata && Object.keys(log.metadata).length
              ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
              : null;

            return (
              <div key={log.id} className="px-5 py-3 flex sm:grid items-start gap-3"
                style={{ gridTemplateColumns: '90px 140px 1fr 180px 90px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: cfg.bg, color: cfg.color, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {log.action}
                </span>
                <div className="hidden sm:block min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>
                    {log.resource_type?.replace(/_/g, ' ') ?? '—'}
                  </p>
                  {log.resource_id && (
                    <p style={{ fontSize: 9, color: C.muted, margin: 0, fontFamily: 'monospace' }}>
                      {log.resource_id.slice(0, 8)}…
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 12, color: C.text, margin: 0, minWidth: 0 }}>{actorName}</p>
                <div className="hidden sm:block min-w-0">
                  {metaStr && (
                    <p style={{ fontSize: 11, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {metaStr}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 10, color: C.muted, margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  {' '}
                  {new Date(log.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          {page > 1 && (
            <a href={filterHref({ page: String(page - 1) })}
              style={{ padding: '7px 16px', borderRadius: 10, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ← Prev
            </a>
          )}
          <span style={{ fontSize: 13, color: C.muted }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={filterHref({ page: String(page + 1) })}
              style={{ padding: '7px 16px', borderRadius: 10, background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Next →
            </a>
          )}
        </div>
      )}
    </>
  );
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/dashboard');

  const { action = '', resource = '', page: pageStr = '1' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr) || 1);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Audit Logs
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Admin actions and system events</p>
      </div>

      <form method="GET" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="action" defaultValue={action}
          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_CFG).map(a => (
            <option key={a} value={a} style={{ textTransform: 'capitalize' }}>{a}</option>
          ))}
        </select>
        <select name="resource" defaultValue={resource}
          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Resources</option>
          {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit"
          style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filter
        </button>
        {(action || resource) && (
          <a href="/admin/audit-logs"
            style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--color-surface-2)', fontSize: 13, color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            Clear ×
          </a>
        )}
      </form>

      <Suspense fallback={
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="dash-skeleton h-12 rounded-lg" />)}
        </div>
      }>
        <LogsList action={action} resource={resource} page={page} />
      </Suspense>
    </div>
  );
}
