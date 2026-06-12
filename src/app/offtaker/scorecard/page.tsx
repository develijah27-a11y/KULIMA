import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

export default async function SupplierScorecardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: scorecards } = await (supabase.from as any)('offtaker_scorecards')
    .select('*')
    .eq('offtaker_id', user.id)
    .order('reliability_score', { ascending: false })
    .limit(50)
    .catch(() => ({ data: [] }));

  const rows = (scorecards ?? []) as any[];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Supplier Scorecard ⭐</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Reliability and quality ratings for your farmer partners</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⭐</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No scorecards yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 320, margin: '4px auto' }}>Rate your farmer suppliers after each completed contract to build up a reliability database.</p>
          <Link href="/offtaker/contracts" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            View Contracts →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((s: any, i: number) => {
            const score = ((s.reliability_score + s.quality_score) / 2).toFixed(1);
            const pScore = parseFloat(score);
            const color = pScore >= 4 ? 'var(--color-success)' : pScore >= 3 ? C.amber : 'var(--color-danger)';
            return (
              <div key={i} style={{ padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                  {s.farmer_name?.[0]?.toUpperCase() ?? 'F'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{s.farmer_name ?? 'Farmer'}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, textTransform: 'capitalize' }}>{s.crop_type} · {(s.total_kg ?? 0).toLocaleString()} kg · {s.district}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.02em', margin: 0 }}>★ {score}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>R:{s.reliability_score} Q:{s.quality_score}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
