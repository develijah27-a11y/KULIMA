import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

export default async function SpendAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('price_ugx, quantity_kg, status, crop_type, created_at, farmer_id')
    .eq('offtaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (contracts ?? []) as any[];

  const completed = rows.filter(c => c.status === 'completed');
  const active    = rows.filter(c => c.status === 'active');

  const totalSpend    = completed.reduce((s: number, c: any) => s + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0), 0);
  const pipelineValue = active.reduce((s: number, c: any) => s + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0), 0);
  const totalKg       = completed.reduce((s: number, c: any) => s + (c.quantity_kg ?? 0), 0);

  // Spend by crop
  const byCrop: Record<string, { spend: number; kg: number; count: number }> = {};
  completed.forEach((c: any) => {
    const crop = c.crop_type ?? 'Other';
    if (!byCrop[crop]) byCrop[crop] = { spend: 0, kg: 0, count: 0 };
    byCrop[crop].spend += (c.price_ugx ?? 0) * (c.quantity_kg ?? 0);
    byCrop[crop].kg    += c.quantity_kg ?? 0;
    byCrop[crop].count += 1;
  });
  const cropBreakdown = Object.entries(byCrop).sort(([, a], [, b]) => b.spend - a.spend).slice(0, 6);

  // Monthly trend (last 6 months)
  const monthlySpend: Record<string, number> = {};
  completed.forEach((c: any) => {
    const month = new Date(c.created_at).toLocaleDateString('en-UG', { month: 'short', year: '2-digit' });
    monthlySpend[month] = (monthlySpend[month] ?? 0) + (c.price_ugx ?? 0) * (c.quantity_kg ?? 0);
  });
  const months = Object.entries(monthlySpend).slice(-6);
  const maxMonthly = Math.max(...months.map(([, v]) => v), 1);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Spend Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Procurement spend breakdown and budget tracking</p>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Spend',     value: `UGX ${Math.round(totalSpend).toLocaleString()}`,    sub: `${completed.length} completed contracts`, color: C.blue },
          { label: 'Pipeline Value',  value: `UGX ${Math.round(pipelineValue).toLocaleString()}`, sub: `${active.length} active contracts`,    color: 'var(--color-success)' },
          { label: 'Total Volume',    value: `${Math.round(totalKg).toLocaleString()} kg`,        sub: 'All time',                              color: 'var(--color-harvest)' },
          { label: 'Avg Price / kg',  value: totalKg > 0 ? `UGX ${Math.round(totalSpend / totalKg).toLocaleString()}` : '—', sub: 'Blended average', color: '#7C3AED' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Spend by crop */}
      {cropBreakdown.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Spend by Crop</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cropBreakdown.map(([crop, data]) => {
              const pct = totalSpend > 0 ? Math.round((data.spend / totalSpend) * 100) : 0;
              return (
                <div key={crop}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                      UGX {Math.round(data.spend).toLocaleString()} · {pct}%
                    </p>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: C.blue, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {months.length > 1 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Monthly Spend Trend</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {months.map(([month, value]) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: C.blue, opacity: 0.8, height: `${Math.round((value / maxMonthly) * 64)}px`, minHeight: 4 }} />
                <p style={{ fontSize: 9, color: C.muted, margin: 0, textAlign: 'center', fontWeight: 600 }}>{month}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>No spend data yet</p>
          <p style={{ fontSize: 13, color: C.muted }}>Analytics will appear here once you have active contracts.</p>
        </div>
      )}
    </div>
  );
}
