import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DISTRICT_NAMES } from '@/lib/districts';

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
  // Every Uganda district, not just the ones with current listings — a
  // dealer scouting where to open a branch or pre-stock needs to see the
  // zero-demand districts too, not just wherever already has activity.
  const allDistricts = DISTRICT_NAMES
    .map(d => [d, districtCount[d] ?? 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          What Farmers Need
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {rows.length} farmers are selling right now — stock these items to match demand
        </p>
      </div>

      {/* All districts, ranked by demand — including zero-demand ones so a
          dealer can spot untapped territory, not just where's already hot */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-1" style={{ color: C.text }}>Demand by District</p>
        <p className="text-xs mb-3" style={{ color: C.muted }}>All {allDistricts.length} districts — the quiet ones are where you'd have the least competition</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allDistricts.map(([d, count]) => (
            <div key={d} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: count > 0 ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
              color: count > 0 ? C.greenMed : C.muted,
            }}>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No market data yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Demand intelligence will appear as farmers create listings.</p>
        </div>
      )}
    </div>
  );
}
