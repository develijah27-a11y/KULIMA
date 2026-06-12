import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const FEATURES = [
  { icon: '🏷️', title: 'Grade Tracking', desc: 'Track A/B/C quality grades for each delivery against contract specs.' },
  { icon: '🧪', title: 'Lab Results', desc: 'Log moisture content, aflatoxin, and other quality test results.' },
  { icon: '📸', title: 'Delivery Photos', desc: 'Attach delivery inspection photos to dispute or confirm quality.' },
  { icon: '⚠️', title: 'Quality Flags', desc: 'Flag substandard deliveries and escalate to the rejection workflow.' },
];

const STANDARDS = [
  { crop: 'Maize', standard: 'UNBS EAS 20', moisture: '≤ 13%', aflatoxin: '< 10 ppb' },
  { crop: 'Coffee (Robusta)', standard: 'UCDA Grade 1', moisture: '≤ 12.5%', aflatoxin: '—' },
  { crop: 'Beans', standard: 'UNBS 17', moisture: '≤ 14%', aflatoxin: '< 5 ppb' },
  { crop: 'Rice (Paddy)', standard: 'UNBS EAS 100', moisture: '≤ 14%', aflatoxin: '—' },
];

export default async function QualityControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quality Control 🔬</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Inspect and grade incoming produce against contract specifications</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Uganda Quality Standards Reference</p>
        </div>
        {STANDARDS.map((s, i) => (
          <div key={s.crop} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 0.8fr 0.8fr', gap: 12, padding: '12px 20px', borderBottom: i < STANDARDS.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{s.crop}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{s.standard}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{s.moisture}</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{s.aflatoxin}</p>
          </div>
        ))}
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🔬</div>
        <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>Quality Logging Coming Soon</p>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>Digital delivery inspection and grading tools are in development.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--d-bg)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/offtaker/contracts" style={{ display: 'inline-block', marginTop: 20, padding: '10px 20px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          View Contracts →
        </Link>
      </div>
    </div>
  );
}
