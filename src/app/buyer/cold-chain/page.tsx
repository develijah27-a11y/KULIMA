import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Snowflake } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: 'Finding Driver',  color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  assigned:   { label: 'Driver Assigned', color: C.blue,                 bg: 'var(--color-sky-bg)' },
  in_transit: { label: 'In Transit',      color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  delivered:  { label: 'Delivered',       color: 'var(--color-purple)', bg: 'var(--color-purple-bg)' },
  cancelled:  { label: 'Cancelled',       color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

export default async function BuyerColdChainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: deliveries } = await (supabase.from as any)('delivery_requests')
    .select(`
      id, pickup_district, dropoff_district, cargo_kg, cargo_type,
      delivery_type, estimated_fare, distance_km, status, payment_status,
      pickup_date, accepted_at, delivered_at, created_at,
      transporter:profiles!delivery_requests_transporter_profile_fkey(full_name, phone_number)
    `)
    .eq('requester_id', user.id)
    .eq('delivery_type', 'cold')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (deliveries ?? []) as any[];
  const active    = rows.filter(d => ['open','assigned','in_transit'].includes(d.status));
  const completed = rows.filter(d => d.status === 'delivered');

  const totalColdKg = completed.reduce((s: number, d: any) => s + (d.cargo_kg ?? 0), 0);
  const totalColdSpend = completed.reduce((s: number, d: any) => s + (d.estimated_fare ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Cool Transport
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Refrigerated deliveries — keeps your produce fresh</p>
        </div>
        <Link href="/buyer/deliveries/new"
          style={{ padding: '9px 16px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          <Snowflake size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Book Cold
        </Link>
      </div>

      {/* Stats */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Active Cold Jobs',   value: `${active.length}`,                                                          color: C.blue },
            { label: 'Total Delivered',    value: `${Math.round(totalColdKg).toLocaleString()} kg`,                            color: 'var(--color-primary)' },
            { label: 'Total Cold Spend',   value: totalColdSpend > 0 ? `UGX ${Math.round(totalColdSpend).toLocaleString()}` : '—', color: 'var(--color-harvest)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active cold deliveries */}
      {active.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ display: 'flex', color: 'var(--color-sky)' }}><Snowflake size={16} /></span>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Active Cold Deliveries</p>
          </div>
          {active.map((d: any, i: number) => {
            const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open;
            return (
              <div key={d.id} style={{ padding: '14px 18px', borderBottom: i < active.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                    {d.pickup_district} → {d.dropoff_district}
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4, color: 'var(--color-sky)' }}><Snowflake size={12} /></span>{d.cargo_type ?? 'Perishable'} · {d.cargo_kg} kg · {d.distance_km ? `${d.distance_km} km` : ''}
                </p>
                {d.transporter && (
                  <p style={{ fontSize: 11, color: C.blue, margin: 0 }}>
                    Driver: {d.transporter.full_name}
                    {d.transporter.phone_number && ` · ${d.transporter.phone_number}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed cold deliveries */}
      {completed.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Completed Cold Deliveries</p>
          </div>
          {completed.map((d: any, i: number) => (
            <div key={d.id} style={{ padding: '13px 18px', borderBottom: i < completed.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                  {d.pickup_district} → {d.dropoff_district}
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                  {d.cargo_kg} kg · {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : ''}
                </p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                UGX {Math.round(d.estimated_fare ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Snowflake size={48} /></div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>No cold chain deliveries yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Book a cold chain delivery to transport perishables like fish, dairy, or fresh produce while maintaining temperature.</p>
          <Link href="/buyer/deliveries/new"
            style={{ display: 'inline-block', padding: '10px 20px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Book Cold Delivery →
          </Link>
        </div>
      )}
    </div>
  );
}
