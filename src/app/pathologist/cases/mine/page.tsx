import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:      { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Open' },
  assigned:  { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Assigned' },
  diagnosed: { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Diagnosed' },
  closed:    { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Closed' },
};

export default async function MyCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: cases } = await (supabase as any)
    .from('disease_cases')
    .select('id, crop_type, symptoms, severity, status, created_at, updated_at')
    .eq('assigned_to', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  const list = cases ?? [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.03em', margin: 0 }}>
          My Cases
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Cases assigned to you — {list.length} active
        </p>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No cases assigned to you yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((c: any) => {
            const st = STATUS_CFG[c.status] ?? { color: 'var(--d-muted)', bg: 'var(--color-surface-2)', label: c.status };
            return (
              <Link
                key={c.id}
                href={`/pathologist/cases/${c.id}`}
                style={{
                  display: 'block', textDecoration: 'none', padding: '16px 20px',
                  borderRadius: 12, background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                      {c.crop_type ?? 'Unknown crop'} — #{c.id.slice(0, 6)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.symptoms?.slice(0, 80) ?? 'No symptoms recorded'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
