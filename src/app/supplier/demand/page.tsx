import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const CROP_INPUTS: Record<string, string[]> = {
  maize:    ['NPK Fertilizer', 'DAP', 'Urea', 'Certified Seed', 'Herbicide'],
  coffee:   ['Foliar Spray', 'Mulch', 'Weedicide', 'CAN Fertilizer'],
  beans:    ['Rhizobium Inoculant', 'Sulphate of Ammonia', 'Fungicide'],
  rice:     ['NPK 17-17-17', 'Basamid', 'Transplant Tools', 'Irrigation Pipes'],
  banana:   ['Potassium Nitrate', 'Musa Weevil Spray', 'Mulch Material'],
  cassava:  ['Cuttings', 'Mancozeb Fungicide', 'Whitefly Pesticide'],
  tomato:   ['Calcium Nitrate', 'Dithane', 'Nematicide', 'Stakes'],
  sunflower:['Triple Super Phosphate', 'CAN', 'Herbicide'],
  sorghum:  ['DAP', 'Urea', 'Bird Netting'],
  cotton:   ['CAN Fertilizer', 'Bollworm Spray', 'Defoliant'],
};

export default async function SupplierDemandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: listings } = await (supabase.from as any)('listings')
    .select('crop_type, district, quantity_kg')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = listings ?? [];
  const cropCount: Record<string, { count: number; qty: number }> = {};
  const districtCount: Record<string, number> = {};
  rows.forEach((l: any) => {
    const k = l.crop_type?.toLowerCase() ?? 'other';
    if (!cropCount[k]) cropCount[k] = { count: 0, qty: 0 };
    cropCount[k].count++;
    cropCount[k].qty += l.quantity_kg ?? 0;
    if (l.district) districtCount[l.district] = (districtCount[l.district] ?? 0) + 1;
  });

  const topCrops = Object.entries(cropCount).sort((a, b) => b[1].count - a[1].count);
  const topDistricts = Object.entries(districtCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Demand Intelligence 📡
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          Live signal from {rows.length} active farmer listings — stock these inputs to match market demand
        </p>
      </div>

      {/* Active districts */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Hottest Districts</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {topDistricts.map(([d, count]) => (
            <div key={d} style={{ padding: '6px 14px', background: 'var(--color-primary-bg)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: C.greenMed }}>
              {d} <span style={{ opacity: 0.6 }}>({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crop demand cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {topCrops.map(([crop, { count, qty }]) => {
          const inputs = CROP_INPUTS[crop] ?? ['General inputs'];
          const pct = Math.round((count / rows.length) * 100);
          return (
            <div key={crop} style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p className="text-sm font-black capitalize" style={{ color: C.text }}>{crop}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed }}>
                    {pct}% of listings
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Active Farms</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>{count}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Total Volume</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>{(qty / 1000).toFixed(1)}t</p>
                  </div>
                </div>
                {/* Bar */}
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: C.green, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ padding: '12px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recommended Inputs to Stock</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {inputs.map(inp => (
                    <span key={inp} style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4, background: 'var(--color-surface-2)', color: C.muted }}>
                      {inp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📡</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No market data yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Demand intelligence will appear as farmers create listings.</p>
        </div>
      )}
    </div>
  );
}
