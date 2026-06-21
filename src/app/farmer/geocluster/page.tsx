import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka',
  'Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo',
];

export default async function GeoClusterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: diseaseData }, { data: priceData }] = await Promise.all([
    (supabase.from as any)('disease_scans')
      .select('district, disease_detected, confidence_score, created_at')
      .not('disease_detected', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase.from as any)('market_prices')
      .select('district, crop_type, price_per_kg, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const scans = (diseaseData ?? []) as any[];
  const prices = (priceData ?? []) as any[];

  // Aggregate disease hotspots
  const districtDiseaseCount: Record<string, number> = {};
  scans.forEach((s: any) => {
    if (s.district) districtDiseaseCount[s.district] = (districtDiseaseCount[s.district] ?? 0) + 1;
  });

  // Top crop prices by district
  const districtTopCrop: Record<string, { crop: string; price: number }> = {};
  prices.forEach((p: any) => {
    if (!p.district) return;
    if (!districtTopCrop[p.district] || p.price_per_kg > districtTopCrop[p.district].price) {
      districtTopCrop[p.district] = { crop: p.crop_type, price: p.price_per_kg };
    }
  });

  const hotspots = Object.entries(districtDiseaseCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const totalScans   = scans.length;
  const totalDisease = scans.filter(s => s.disease_detected && s.disease_detected !== 'Healthy').length;
  const affectedDistricts = Object.keys(districtDiseaseCount).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          GeoCluster Map
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Disease outbreaks and price hotspots across Uganda — last 30 days</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Scans',       value: totalScans,        color: C.green },
          { label: 'Disease Reports',   value: totalDisease,      color: 'var(--color-danger)' },
          { label: 'Districts Affected',value: affectedDistricts, color: 'var(--color-harvest)' },
        ].map(s => (
          <div key={s.label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: '0 0 3px', letterSpacing: '-0.03em' }}>{s.value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* District grid map */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>District Overview</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {DISTRICTS.map(district => {
            const diseaseCount = districtDiseaseCount[district] ?? 0;
            const topCrop = districtTopCrop[district];
            const risk = diseaseCount > 5 ? 'high' : diseaseCount > 2 ? 'medium' : diseaseCount > 0 ? 'low' : 'none';
            const riskColor = { high: 'var(--color-danger)', medium: 'var(--color-harvest)', low: 'var(--color-success)', none: C.muted }[risk];
            const riskBg    = { high: 'var(--color-danger-bg)', medium: 'var(--color-harvest-bg)', low: 'var(--color-success-bg)', none: 'var(--color-surface-2)' }[risk];

            return (
              <div key={district} style={{ padding: '10px 12px', borderRadius: 10, background: riskBg, border: `1px solid ${riskColor}22` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{district}</p>
                {diseaseCount > 0 && (
                  <p style={{ fontSize: 10, color: riskColor, margin: '0 0 2px', fontWeight: 600 }}>
                    ⚠ {diseaseCount} disease {diseaseCount === 1 ? 'report' : 'reports'}
                  </p>
                )}
                {topCrop && (
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                    📈 {topCrop.crop} · UGX {Number(topCrop.price).toLocaleString()}/kg
                  </p>
                )}
                {diseaseCount === 0 && !topCrop && (
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>No recent activity</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Disease hotspots */}
      {hotspots.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', margin: 0 }}>Disease Hotspots</p>
          </div>
          {hotspots.map(([district, count], i) => (
            <div key={district} style={{ padding: '13px 18px', borderBottom: i < hotspots.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--color-danger)', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 1px' }}>{district}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{count} disease {count === 1 ? 'scan' : 'scans'} in last 30 days</p>
              </div>
              <div style={{ width: `${Math.round((count / hotspots[0][1]) * 80)}px`, height: 6, borderRadius: 3, background: 'var(--color-danger)', opacity: 0.6 }} />
            </div>
          ))}
        </div>
      )}

      {totalScans === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🗺️</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No data yet for your area</p>
          <p style={{ fontSize: 13, color: C.muted }}>As farmers use the Disease Detector and market features, clusters will appear on this map.</p>
        </div>
      )}
    </div>
  );
}
