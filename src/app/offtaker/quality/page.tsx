import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const STANDARDS = [
  { crop: 'Maize',           standard: 'UNBS EAS 20',   moisture: '≤ 13%',   aflatoxin: '< 10 ppb' },
  { crop: 'Coffee (Robusta)',standard: 'UCDA Grade 1',  moisture: '≤ 12.5%', aflatoxin: '—' },
  { crop: 'Beans',           standard: 'UNBS 17',       moisture: '≤ 14%',   aflatoxin: '< 5 ppb' },
  { crop: 'Rice (Paddy)',    standard: 'UNBS EAS 100',  moisture: '≤ 14%',   aflatoxin: '—' },
];

export default async function QualityControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('id, status, crop_type, quantity_kg, price_ugx, created_at, farmer_id')
    .eq('offtaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (contracts ?? []) as any[];

  // Derive quality signals from contract statuses
  const completed = rows.filter(c => c.status === 'completed');
  const cancelled = rows.filter(c => c.status === 'cancelled');
  const active    = rows.filter(c => c.status === 'active');

  // Completion rate as a quality proxy
  const total = completed.length + cancelled.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  // Crop quality summary
  const byCrop: Record<string, { completed: number; cancelled: number; kg: number }> = {};
  rows.forEach((c: any) => {
    const crop = c.crop_type ?? 'Other';
    if (!byCrop[crop]) byCrop[crop] = { completed: 0, cancelled: 0, kg: 0 };
    if (c.status === 'completed') { byCrop[crop].completed++; byCrop[crop].kg += c.quantity_kg ?? 0; }
    if (c.status === 'cancelled')  byCrop[crop].cancelled++;
  });
  const cropQuality = Object.entries(byCrop).sort(([, a], [, b]) => b.completed - a.completed).slice(0, 6);

  const totalKg = completed.reduce((s: number, c: any) => s + (c.quantity_kg ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Quality Control
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Delivery fulfilment and produce quality tracking</p>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Fulfilment Rate',   value: `${completionRate}%`, color: completionRate >= 80 ? 'var(--color-success)' : completionRate >= 60 ? 'var(--color-harvest)' : 'var(--color-danger)' },
          { label: 'Volume Received',   value: `${Math.round(totalKg).toLocaleString()} kg`, color: C.blue },
          { label: 'Active Contracts',  value: `${active.length}`, color: 'var(--color-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Fulfilment by crop */}
      {cropQuality.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Fulfilment by Crop</p>
          </div>
          {cropQuality.map(([crop, data], i) => {
            const cropTotal = data.completed + data.cancelled;
            const rate = cropTotal > 0 ? Math.round((data.completed / cropTotal) * 100) : 0;
            const rateColor = rate >= 80 ? 'var(--color-success)' : rate >= 60 ? 'var(--color-harvest)' : 'var(--color-danger)';
            return (
              <div key={crop} style={{ padding: '13px 20px', borderBottom: i < cropQuality.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    {data.completed}/{cropTotal} · {Math.round(data.kg).toLocaleString()} kg
                  </p>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${rate}%`, borderRadius: 3, background: rateColor }} />
                </div>
                <p style={{ fontSize: 10, color: rateColor, margin: '3px 0 0', fontWeight: 700 }}>{rate}% fulfilment</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Uganda quality standards reference */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Uganda Quality Standards Reference</p>
          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Use these benchmarks when inspecting incoming produce</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 0.8fr 0.8fr', gap: 0, padding: '8px 20px', borderBottom: `1px solid ${C.border}` }}>
          {['Crop', 'Standard', 'Moisture', 'Aflatoxin'].map(h => (
            <p key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</p>
          ))}
        </div>
        {STANDARDS.map((s, i) => (
          <div key={s.crop} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 0.8fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: i < STANDARDS.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{s.crop}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{s.standard}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{s.moisture}</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{s.aflatoxin}</p>
          </div>
        ))}
      </div>

      {/* Grade logging coming soon */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ display: 'flex', flexShrink: 0, color: 'var(--color-sky)' }}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5h13l-5-5V3"/></svg></span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Digital Grade Logging — Coming Soon</p>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px' }}>Attach moisture readings, photos, and lab results to each contract delivery batch.</p>
          <Link href="/offtaker/contracts" style={{ fontSize: 12, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>View Contracts →</Link>
        </div>
      </div>

      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg></div>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No contract data yet</p>
          <p style={{ fontSize: 13, color: C.muted }}>Quality metrics will appear as you receive produce against contracts.</p>
        </div>
      )}
    </div>
  );
}
