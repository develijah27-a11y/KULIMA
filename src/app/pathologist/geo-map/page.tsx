import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', red: 'var(--color-danger)', amber: 'var(--color-harvest)',
};

export default async function GeoMapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: reports } = await (supabase.from as any)('disease_reports')
    .select('district, crop_type, urgency, status')
    .in('status', ['reported', 'assigned'])
    .limit(100);

  const rows = (reports ?? []) as any[];
  const byDistrict: Record<string, { count: number; high: number; crops: Set<string> }> = {};
  rows.forEach((r: any) => {
    const d = r.district ?? 'Unknown';
    if (!byDistrict[d]) byDistrict[d] = { count: 0, high: 0, crops: new Set() };
    byDistrict[d].count++;
    if (r.urgency === 'high') byDistrict[d].high++;
    if (r.crop_type) byDistrict[d].crops.add(r.crop_type);
  });

  const hotspots = Object.entries(byDistrict).sort((a, b) => b[1].high - a[1].high || b[1].count - a[1].count);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Outbreak GeoMap</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Disease case distribution across Uganda districts</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '28px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'rgba(255,255,255,0.5)' }}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg></div>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Interactive Map Coming Soon</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          A visual heat map of disease outbreaks by district will be available in the next update.
        </p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Current Hotspots</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{rows.length} active cases across {hotspots.length} districts</p>
        </div>
        {hotspots.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>No active cases reported.</p>
          </div>
        ) : (
          <div>
            {hotspots.map(([district, data]) => (
              <div key={district} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: data.high > 0 ? 'var(--color-danger)' : 'var(--color-harvest)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{district}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>
                      {Array.from(data.crops).join(', ')}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{data.count} case{data.count !== 1 ? 's' : ''}</p>
                  {data.high > 0 && <p style={{ fontSize: 11, color: C.red, fontWeight: 700, margin: '2px 0 0' }}>{data.high} urgent</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
