import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', red: 'var(--color-danger)', amber: '#D97706',
};

const SEV_CFG: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: '#059669', bg: '#D1FAE5', label: 'Low' },
  medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium' },
  high:     { color: '#DC2626', bg: '#FEE2E2', label: 'High' },
  critical: { color: '#7F1D1D', bg: '#FEE2E2', label: 'Critical' },
  unknown:  { color: '#6B7280', bg: '#F3F4F6', label: 'Unknown' },
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:      { color: '#DC2626', bg: '#FEE2E2', label: 'Open' },
  assigned:  { color: '#D97706', bg: '#FEF3C7', label: 'Assigned' },
  diagnosed: { color: '#0284C7', bg: '#DBEAFE', label: 'Diagnosed' },
  closed:    { color: '#059669', bg: '#D1FAE5', label: 'Closed' },
};

const CROP_EMOJI: Record<string, string> = {
  maize:'🌽', coffee:'☕', beans:'🫘', banana:'🍌', cassava:'🥔', tomato:'🍅', rice:'🌾', sunflower:'🌻',
};

const TABS = [
  { key: '',           label: 'All Cases' },
  { key: 'open',       label: 'Open' },
  { key: 'assigned',   label: 'Assigned' },
  { key: 'diagnosed',  label: 'Diagnosed' },
  { key: 'closed',     label: 'Closed' },
] as const;

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60)    return `${d}m ago`;
  if (d < 1440)  return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default async function PathologistCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const { status = '', severity = '' } = await searchParams;

  let q = (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, severity, district, status, reported_at, created_at, pathologist_id, diagnosis')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(80);

  if (status)   q = q.eq('status', status);
  if (severity) q = q.eq('severity', severity);

  const { data: cases, error } = await q;
  const rows: any[] = cases ?? [];

  const counts = {
    open:      rows.filter(r => r.status === 'open').length,
    assigned:  rows.filter(r => r.status === 'assigned').length,
    diagnosed: rows.filter(r => r.status === 'diagnosed').length,
    critical:  rows.filter(r => ['high','critical'].includes(r.severity)).length,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Case Queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>{rows.length} cases · {counts.open} open · {counts.critical} high/critical</p>
        </div>
        {counts.open > 0 && (
          <div style={{ padding: '6px 14px', borderRadius: 10, background: '#FEE2E2' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.red, margin: 0 }}>⚠ {counts.open} pending triage</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Open',      value: counts.open,      color: C.red     },
          { label: 'Assigned',  value: counts.assigned,  color: C.amber   },
          { label: 'Diagnosed', value: counts.diagnosed, color: '#0284C7' },
          { label: 'High/Crit', value: counts.critical,  color: C.red     },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.03em', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + severity filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {TABS.map(t => (
          <a key={t.key}
            href={`/pathologist/cases${t.key ? `?status=${t.key}` : ''}${severity ? `${t.key ? '&' : '?'}severity=${severity}` : ''}`}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              background: status === t.key ? C.green : 'var(--d-subtle)', color: status === t.key ? '#fff' : C.muted }}>
            {t.label}
          </a>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <form method="GET" style={{ display: 'flex', gap: 6 }}>
            {status && <input type="hidden" name="status" value={status} />}
            <select name="severity" defaultValue={severity}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 12 }}>
              <option value="">All severities</option>
              {Object.entries(SEV_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button type="submit" style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Go</button>
          </form>
        </div>
      </div>

      {/* Case list */}
      {error ? (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>Error loading disease reports: {String(error)}</p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>✅</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No cases found</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {status || severity ? 'Try clearing the filters.' : 'The queue is clear.'}
          </p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((c: any, i: number) => {
            const sev = SEV_CFG[c.severity] ?? SEV_CFG.unknown;
            const st  = STATUS_CFG[c.status] ?? STATUS_CFG.open;
            const isAssignedToMe = c.pathologist_id === profile.id;
            return (
              <Link
                key={c.id}
                href={`/pathologist/cases/${c.id}`}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', textDecoration: 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌱'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                      {c.crop_type} — {c.district}
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sev.bg, color: sev.color }}>{sev.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                    {isAssignedToMe && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#D1FAE5', color: '#059669' }}>Mine</span>}
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.symptoms ?? 'No symptoms described'}
                  </p>
                  {c.diagnosis && (
                    <p style={{ fontSize: 11, color: C.greenMed, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Dx: {c.diagnosis}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginTop: 2 }}>{timeAgo(c.created_at)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
