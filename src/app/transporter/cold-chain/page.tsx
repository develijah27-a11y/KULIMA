import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Snowflake, AlertTriangle, Thermometer } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  assigned:   { label: 'En Route to Pickup', color: C.blue,                 bg: 'var(--color-sky-bg)' },
  in_transit: { label: 'In Transit',         color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  delivered:  { label: 'Delivered',          color: '#7C3AED',              bg: '#EDE9FE' },
};

export default async function TransporterColdChainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: vehicle }, { data: active }, { data: history }] = await Promise.all([
    (supabase.from as any)('vehicles')
      .select('id, make, model, plate_number, is_cold_capable')
      .eq('user_id', user.id)
      .eq('is_cold_capable', true)
      .single(),
    (supabase.from as any)('delivery_requests')
      .select(`
        id, pickup_district, pickup_location, dropoff_district, dropoff_location,
        cargo_kg, cargo_type, estimated_fare, driver_earnings, distance_km,
        status, accepted_at, pickup_date
      `)
      .eq('transporter_id', user.id)
      .eq('delivery_type', 'cold')
      .in('status', ['assigned', 'in_transit'])
      .order('accepted_at', { ascending: false }),
    (supabase.from as any)('delivery_requests')
      .select(`
        id, pickup_district, dropoff_district, cargo_kg, cargo_type,
        driver_earnings, payment_status, delivered_at
      `)
      .eq('transporter_id', user.id)
      .eq('delivery_type', 'cold')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(30),
  ]);

  const activeRows  = (active ?? []) as any[];
  const historyRows = (history ?? []) as any[];

  const totalEarned = historyRows
    .filter((d: any) => d.payment_status === 'paid')
    .reduce((s: number, d: any) => s + (d.driver_earnings ?? 0), 0);
  const totalColdKg = historyRows.reduce((s: number, d: any) => s + (d.cargo_kg ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cool Transport Logs
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Your refrigerated delivery history</p>
      </div>

      {/* Cold-capable vehicle badge */}
      {vehicle ? (
        <div style={{ background: 'var(--color-sky-bg)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', color: 'var(--color-sky)' }}><Snowflake size={22} /></span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.blue, margin: '0 0 2px' }}>Cool Transport Certified Vehicle</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{vehicle.make} {vehicle.model} · {vehicle.plate_number}</p>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-harvest-bg)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', color: 'var(--color-harvest)' }}><AlertTriangle size={20} /></span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-harvest)', margin: '0 0 2px' }}>No Cold-Capable Vehicle Registered</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Enable "Cold chain capable" on your vehicle to receive refrigerated jobs.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {(activeRows.length > 0 || historyRows.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Active Jobs',     value: `${activeRows.length}`,                                                            color: C.blue },
            { label: 'Cold Cargo',      value: `${Math.round(totalColdKg).toLocaleString()} kg`,                                  color: 'var(--color-primary)' },
            { label: 'Cold Earnings',   value: totalEarned > 0 ? `UGX ${Math.round(totalEarned).toLocaleString()}` : '—',         color: 'var(--color-harvest)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active cold jobs */}
      {activeRows.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ display: 'flex', color: 'var(--color-sky)' }}><Snowflake size={16} /></span>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Active Cold Jobs</p>
          </div>
          {activeRows.map((d: any, i: number) => {
            const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.assigned;
            return (
              <div key={d.id} style={{ padding: '14px 18px', borderBottom: i < activeRows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                    {d.pickup_district} → {d.dropoff_district}
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>
                  {d.cargo_type ?? 'Perishable'} · {d.cargo_kg} kg · {d.distance_km ? `${d.distance_km} km` : ''}
                </p>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                  Earn UGX {Math.round(d.driver_earnings ?? 0).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Delivery history */}
      {historyRows.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Cool Transport History</p>
          </div>
          {historyRows.map((d: any, i: number) => (
            <div key={d.id} style={{ padding: '13px 18px', borderBottom: i < historyRows.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4, color: 'var(--color-sky)' }}><Snowflake size={12} /></span>{d.pickup_district} → {d.dropoff_district}
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                  {d.cargo_kg} kg · {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
                  UGX {Math.round(d.driver_earnings ?? 0).toLocaleString()}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                  background: d.payment_status === 'paid' ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
                  color: d.payment_status === 'paid' ? 'var(--color-success)' : C.muted }}>
                  {d.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeRows.length === 0 && historyRows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Thermometer size={48} /></div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>No cold chain deliveries yet</p>
          <p style={{ fontSize: 13, color: C.muted }}>
            {vehicle ? 'Enable your vehicle and accept cold delivery requests from the Active Jobs page.' : 'Register a cold-capable vehicle to start receiving refrigerated delivery requests.'}
          </p>
        </div>
      )}
    </div>
  );
}
