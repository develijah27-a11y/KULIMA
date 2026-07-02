import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ResolvedCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: cases } = await (supabase as any)
    .from('disease_cases')
    .select('id, crop_type, symptoms, severity, status, created_at, updated_at')
    .eq('status', 'closed')
    .order('updated_at', { ascending: false })
    .limit(100);

  const list = cases ?? [];

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.03em', margin: 0 }}>
          Resolved Cases
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          {list.length} closed cases
        </p>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No resolved cases yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c: any) => (
            <Link
              key={c.id}
              href={`/pathologist/cases/${c.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none',
                padding: '14px 18px', borderRadius: 12,
                background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, color: 'var(--color-success)' }}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {c.crop_type ?? 'Unknown crop'} — #{c.id.slice(0, 6)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Closed {timeAgo(c.updated_at ?? c.created_at)}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-support)', flexShrink: 0 }}>
                {c.severity}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
