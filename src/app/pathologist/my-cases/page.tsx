import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', red: 'var(--color-danger)', greenMed: 'var(--color-primary-hover)',
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default async function MyCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: cases } = await (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, district, urgency, farmer_name, status, diagnosis, created_at, updated_at')
    .eq('pathologist_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  const rows = (cases ?? []) as any[];

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'Pending',    color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)' },
    in_review:  { label: 'In Review', color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)'     },
    resolved:   { label: 'Resolved',  color: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
  };

  const CROP_EMOJI: Record<string, string> = { maize: '🌽', coffee: '☕', beans: '🫘', banana: '🍌', cassava: '🥔', tomato: '🍅', rice: '🌾' };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Cases 📁</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{rows.length} case{rows.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <Link href="/pathologist/my-cases/new" style={{ padding: '8px 16px', background: C.red, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + File Case
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📁</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No cases yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Cases assigned to you from the queue will appear here.</p>
          <Link href="/pathologist/case-queue" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.red, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Go to Case Queue →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((c: any, i: number) => {
            const st = STATUS[c.status] ?? STATUS.pending;
            return (
              <Link key={c.id} href={`/pathologist/cases/${c.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
                textDecoration: 'none', background: C.cardBg,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌱'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{c.crop_type} · {c.district}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.diagnosis ?? c.symptoms ?? 'No diagnosis yet'}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>{timeAgo(c.updated_at)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
