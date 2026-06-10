import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

const ACTION_COLOR: Record<string, string> = {
  create:  'var(--color-success)',
  update:  'var(--color-sky)',
  delete:  'var(--color-danger)',
  login:   'var(--color-primary)',
  logout:  '#6B7280',
  approve: 'var(--color-success)',
  reject:  'var(--color-danger)',
  suspend: 'var(--color-warning)',
};

const RESOURCE_TYPES = ['profiles','listings','offers','delivery_requests','wallets','verifications','fraud_flags','farm_inventory'];

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/auth/signin');

  const { action = '', resource = '', page: pageStr = '1' } = await searchParams;
  const page  = Math.max(1, parseInt(pageStr) || 1);
  const limit = 50;
  const from  = (page - 1) * limit;

  let q = (supabase.from as any)('audit_logs')
    .select('id, user_id, action, resource_type, resource_id, metadata, ip_address, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (action)   q = q.eq('action', action);
  if (resource) q = q.eq('resource_type', resource);

  const { data: logs, count, error } = await q;
  const rows: any[] = logs ?? [];
  const total = count ?? 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Audit Logs
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>
          {total.toLocaleString()} total log entries
        </p>
      </div>

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="action" defaultValue={action}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLOR).map(a => <option key={a} value={a} style={{ textTransform: 'capitalize' }}>{a}</option>)}
        </select>
        <select name="resource" defaultValue={resource}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Resources</option>
          {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit" style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filter
        </button>
      </form>

      {/* Logs table */}
      {error ? (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>Error loading audit logs. The table may not exist yet.</p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>📋</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No logs found</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {action || resource ? 'Try a different filter.' : 'Audit events will appear here as users take actions.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '100px 120px 1fr 100px', gap: 12 }}>
              {['Action', 'Resource', 'Details', 'Time'].map(h => (
                <p key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, margin: 0 }}>{h}</p>
              ))}
            </div>
            {rows.map((log: any, i: number) => {
              const aColor = ACTION_COLOR[log.action] ?? C.muted;
              return (
                <div key={log.id} style={{ padding: '10px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', display: 'grid', gridTemplateColumns: '100px 120px 1fr 100px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${aColor}18`, color: aColor, display: 'inline-block', textTransform: 'uppercase' }}>
                    {log.action}
                  </span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: '0 0 1px' }}>{log.resource_type ?? '—'}</p>
                    {log.resource_id && (
                      <p style={{ fontSize: 9, color: C.muted, margin: 0, fontFamily: 'monospace' }}>{log.resource_id.slice(0, 12)}…</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 1px', fontFamily: 'monospace' }}>
                      {log.user_id?.slice(0, 18)}…
                    </p>
                    {log.ip_address && (
                      <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{log.ip_address}</p>
                    )}
                    {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                      <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>
                        {JSON.stringify(log.metadata).slice(0, 60)}{JSON.stringify(log.metadata).length > 60 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                    {new Date(log.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                    {' '}
                    {new Date(log.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {page > 1 && (
                <a href={`?action=${action}&resource=${resource}&page=${page - 1}`}
                  style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid var(--d-border)', color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  ← Prev
                </a>
              )}
              <span style={{ padding: '7px 16px', fontSize: 13, color: C.muted }}>
                Page {page} of {Math.ceil(total / limit)}
              </span>
              {page < Math.ceil(total / limit) && (
                <a href={`?action=${action}&resource=${resource}&page=${page + 1}`}
                  style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid var(--d-border)', color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Next →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
