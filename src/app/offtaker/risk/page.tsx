import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

const RISK_TYPES = [
  { icon: '🌧️', title: 'Weather Risk', color: 'var(--color-sky)', bg: 'var(--color-sky-bg)', desc: 'Drought, floods, and unseasonal rain causing crop failure in contracted districts.', level: 'Medium', affected: ['Northern Uganda', 'Karamoja'] },
  { icon: '🦟', title: 'Pest & Disease', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', desc: 'Fall Armyworm and other active outbreaks in maize-growing regions.', level: 'High', affected: ['Eastern Uganda', 'Western Uganda'] },
  { icon: '📉', title: 'Price Volatility', color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', desc: 'Market price swings that could push contracted prices above spot rate.', level: 'Low', affected: ['All regions'] },
  { icon: '🚚', title: 'Logistics Risk', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)', desc: 'Road conditions and transport delays affecting delivery timelines.', level: 'Low', affected: ['Remote districts'] },
];

const LEVEL_COLOR: Record<string, string> = { High: 'var(--color-danger)', Medium: 'var(--color-harvest)', Low: 'var(--color-success)' };
const LEVEL_BG: Record<string, string> = { High: 'var(--color-danger-bg)', Medium: 'var(--color-harvest-bg)', Low: 'var(--color-success-bg)' };

export default async function RiskManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('status, delivery_date, quantity_kg')
    .eq('offtaker_id', user.id)
    .eq('status', 'active')
    .limit(50);

  const activeContracts = (contracts ?? []) as any[];
  const soonDeliveries = activeContracts.filter((c: any) => {
    const daysLeft = Math.ceil((new Date(c.delivery_date).getTime() - Date.now()) / 864e5);
    return daysLeft <= 14 && daysLeft >= 0;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Risk Management ⚠️</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Monitor procurement risks and supply chain exposure</p>
      </div>

      {soonDeliveries.length > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--color-harvest-bg)', border: `1px solid var(--color-harvest)`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>⏰</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-harvest)', margin: '0 0 2px' }}>Deliveries Due Within 14 Days</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{soonDeliveries.length} contract{soonDeliveries.length !== 1 ? 's' : ''} · {soonDeliveries.reduce((s: number, c: any) => s + (c.quantity_kg ?? 0), 0).toLocaleString()} kg incoming</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {RISK_TYPES.map(risk => (
          <div key={risk.title} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: risk.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {risk.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{risk.title}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: LEVEL_BG[risk.level], color: LEVEL_COLOR[risk.level] }}>{risk.level}</span>
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 6px' }}>{risk.desc}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {risk.affected.map(a => (
                  <span key={a} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--d-bg)', color: C.muted }}>{a}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px', borderRadius: 14, background: C.cardBg, boxShadow: C.cardShadow }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>📋 Automated Risk Alerts Coming Soon</p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>We're building SMS and push notifications for when weather or disease alerts affect your contract districts. Stay tuned.</p>
      </div>
    </div>
  );
}
