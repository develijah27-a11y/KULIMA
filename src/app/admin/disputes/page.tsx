import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: '#1B4332', greenMed: '#40916C',
  red: '#E63946', amber: '#D97706', blue: '#0284C7',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:         { color: '#DC2626', bg: '#FEE2E2', label: 'Open' },
  under_review: { color: '#D97706', bg: '#FEF3C7', label: 'Under Review' },
  resolved:     { color: '#059669', bg: '#D1FAE5', label: 'Resolved' },
  closed:       { color: '#6B7280', bg: '#F3F4F6', label: 'Closed' },
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/auth/signin');

  const { status = '' } = await searchParams;

  let q = (supabase.from as any)('disputes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);

  const { data: disputes, error } = await q;
  const rows: any[] = disputes ?? [];

  const openCount     = rows.filter(r => r.status === 'open').length;
  const reviewCount   = rows.filter(r => r.status === 'under_review').length;
  const resolvedCount = rows.filter(r => r.status === 'resolved').length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Dispute Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Transaction disputes and conflict resolution</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: openCount, color: C.red },
          { label: 'Under Review', value: reviewCount, color: C.amber },
          { label: 'Resolved', value: resolvedCount, color: C.greenMed },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '16px 18px' }}>
            <p style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-0.03em', margin: '0 0 4px' }}>{value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['', 'open', 'under_review', 'resolved', 'closed'] as const).map(s => (
          <a key={s} href={s ? `?status=${s}` : '/admin/disputes'}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: 'none', textTransform: 'capitalize',
              background: status === s ? C.green : 'var(--d-subtle)', color: status === s ? '#fff' : C.muted }}>
            {s ? s.replace('_', ' ') : 'All'}
          </a>
        ))}
      </div>

      {/* Disputes list */}
      {error ? (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>
            Error loading disputes table. It may have a different schema — check the database.
          </p>
          <p style={{ color: C.muted, fontSize: 11, marginTop: 6, fontFamily: 'monospace' }}>{String(error)}</p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>⚖️</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No disputes</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {status ? 'No disputes with this status.' : 'All transactions are going smoothly.'}
          </p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((d: any, i: number) => {
            const st = STATUS_CFG[d.status] ?? STATUS_CFG.open;
            const cols = Object.keys(d).filter(k => !['id','created_at','updated_at'].includes(k));
            return (
              <div key={d.id} style={{ padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                      <p style={{ fontSize: 10, color: C.muted, margin: 0, fontFamily: 'monospace' }}>#{d.id?.slice(0, 8)}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {cols.slice(0, 6).map(k => (
                        <div key={k}>
                          <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 1px' }}>{k.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 12, color: C.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {String(d[k] ?? '—')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                  {new Date(d.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
