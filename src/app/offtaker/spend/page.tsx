import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const FEATURES = [
  { icon: '📊', title: 'Spend by Crop', desc: 'See how procurement budget splits across crop types.' },
  { icon: '📆', title: 'Monthly Trends', desc: 'Track monthly spend against your procurement targets.' },
  { icon: '🗺️', title: 'Spend by Region', desc: 'Understand which districts drive the most volume and cost.' },
  { icon: '📉', title: 'Price Variance', desc: 'Compare contracted prices vs. market prices over time.' },
];

export default async function SpendAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('price_ugx, quantity_kg, status, crop_type, created_at')
    .eq('offtaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (contracts ?? []) as any[];
  const totalSpend = rows.filter((c: any) => c.status === 'completed').reduce((s: number, c: any) => s + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0), 0);
  const pipelineValue = rows.filter((c: any) => c.status === 'active').reduce((s: number, c: any) => s + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Spend Analytics 📊</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Procurement spend breakdown and budget tracking</p>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Total Spend', value: `UGX ${Math.round(totalSpend).toLocaleString()}`, sub: 'Completed contracts' },
            { label: 'Pipeline Value', value: `UGX ${Math.round(pipelineValue).toLocaleString()}`, sub: 'Active contracts' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: C.blue, margin: '0 0 2px', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>📊</div>
        <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>Detailed Analytics Coming Soon</p>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>Visual charts and deep-dive spend reports are in development.</p>
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
      </div>
    </div>
  );
}
