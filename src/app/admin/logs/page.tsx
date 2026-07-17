import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Activity, AlertTriangle, CreditCard, ShieldAlert, Gauge } from 'lucide-react';

const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green:      'var(--color-primary)',
  red:        'var(--color-danger)',
  blue:       'var(--color-sky)',
  amber:      'var(--color-harvest)',
};

const CATEGORY_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  api_request:    { label: 'API Request',    color: C.blue,  bg: 'var(--color-sky-bg)',     icon: <Activity size={14} /> },
  error:          { label: 'Error',          color: C.red,   bg: 'var(--color-danger-bg)',  icon: <AlertTriangle size={14} /> },
  failed_payment: { label: 'Failed Payment', color: C.amber, bg: 'var(--color-harvest-bg)', icon: <CreditCard size={14} /> },
  auth_failure:   { label: 'Auth Failure',   color: C.red,   bg: 'var(--color-danger-bg)',  icon: <ShieldAlert size={14} /> },
  performance:    { label: 'Slow Request',   color: C.amber, bg: 'var(--color-harvest-bg)', icon: <Gauge size={14} /> },
};

const PAGE_SIZE = 50;

async function LogsSummary() {
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const categories = Object.keys(CATEGORY_CFG);
  const counts = await Promise.all(
    categories.map(cat =>
      (supabase.from as any)('system_logs')
        .select('id', { count: 'exact', head: true })
        .eq('category', cat)
        .gte('created_at', dayAgo)
    )
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {categories.map((cat, i) => {
        const cfg = CATEGORY_CFG[cat];
        const count = counts[i].count ?? 0;
        return (
          <div key={cat} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, borderTop: `3px solid ${cfg.color}`, padding: '14px 14px' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>24h</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: cfg.color, letterSpacing: '-0.02em' }}>{count}</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{cfg.label}</p>
          </div>
        );
      })}
    </div>
  );
}

async function LogsList({ category, page }: { category: string; page: number }) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let q = (supabase.from as any)('system_logs')
    .select('id, category, level, route, method, status_code, duration_ms, user_id, message, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (category) q = q.eq('category', category);

  const { data: logs, count, error } = await q;
  const rows: any[] = logs ?? [];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ category, page: '1', ...overrides });
    if (!p.get('category')) p.delete('category');
    return `/admin/logs?${p}`;
  }

  if (error) {
    return (
      <div style={{ background: 'var(--color-danger-bg)', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ color: C.red, fontSize: 13 }}>
          Could not load system logs. Run migration <code>20260717000003_system_logs.sql</code> to create the table.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><Activity size={48} /></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No log entries yet</p>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {category ? 'Try a different filter.' : 'Errors, slow requests, failed payments, and auth failures on instrumented routes show up here automatically.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        <div className="hidden sm:grid px-5 py-3" style={{ gridTemplateColumns: '130px 200px 70px 70px 1fr 90px', gap: 12, borderBottom: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
          {['Category', 'Route', 'Status', 'ms', 'Message', 'Time'].map(h => (
            <p key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, margin: 0 }}>{h}</p>
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((log: any) => {
            const cfg = CATEGORY_CFG[log.category] ?? { label: log.category, color: C.muted, bg: 'var(--color-surface-2)', icon: null };
            return (
              <div key={log.id} className="px-5 py-3 flex sm:grid items-start gap-3"
                style={{ gridTemplateColumns: '130px 200px 70px 70px 1fr 90px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                  {cfg.label}
                </span>
                <p style={{ fontSize: 11, color: C.text, margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.method ? `${log.method} ` : ''}{log.route ?? '—'}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: log.status_code >= 500 ? C.red : log.status_code >= 400 ? C.amber : C.muted, margin: 0 }}>
                  {log.status_code ?? '—'}
                </p>
                <p style={{ fontSize: 11, color: log.duration_ms > 3000 ? C.amber : C.muted, margin: 0 }}>
                  {log.duration_ms != null ? log.duration_ms : '—'}
                </p>
                <p style={{ fontSize: 12, color: C.text, margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                  {log.message}
                </p>
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

export default async function AdminSystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/dashboard');

  const { category = '', page: pageStr = '1' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr) || 1);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          System Logs
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>
          Errors, slow requests, failed payments, and auth failures — separate from <a href="/admin/audit-logs" style={{ color: C.blue }}>Audit Logs</a>, which tracks business actions.
        </p>
      </div>

      <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}</div>}>
        <LogsSummary />
      </Suspense>

      <form method="GET" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="category" defaultValue={category}
          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <button type="submit"
          style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filter
        </button>
        {category && (
          <a href="/admin/logs"
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
        <LogsList category={category} page={page} />
      </Suspense>
    </div>
  );
}
