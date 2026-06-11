import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const SEV_CFG: Record<string, { color: string; bg: string }> = {
  high:     { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  critical: { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
};

export default async function UrgentCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: cases } = await (supabase as any)
    .from('disease_cases')
    .select('id, crop_type, symptoms, severity, status, created_at, farmer_id')
    .in('severity', ['high', 'critical'])
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(50);

  const list = cases ?? [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.03em', margin: 0 }}>
          Urgent Cases
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          High and critical severity cases requiring immediate attention
        </p>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No urgent cases right now ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((c: any) => {
            const sev = SEV_CFG[c.severity] ?? { color: 'var(--d-muted)', bg: 'var(--color-surface-2)' };
            return (
              <Link
                key={c.id}
                href={`/pathologist/cases/${c.id}`}
                style={{
                  display: 'block', textDecoration: 'none', padding: '16px 20px',
                  borderRadius: 12, background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  borderLeft: `4px solid ${sev.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                      {c.crop_type ?? 'Unknown crop'} — Case #{c.id.slice(0, 6)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      {c.symptoms?.slice(0, 80) ?? 'No symptoms recorded'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sev.bg, color: sev.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {c.severity.toUpperCase()}
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
