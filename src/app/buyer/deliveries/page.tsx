import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PayDeliveryButton } from './PayDeliveryButton';
import { ShareLocationButton } from '@/components/delivery/ShareLocationButton';
import { TrackDeliveryButton } from '@/components/delivery/TrackDeliveryButton';
import type { JSX } from 'react';
import { Truck, Search, Car, Package, Snowflake, Zap, CheckCircle2, User } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG: Record<string, { icon: JSX.Element; label: string; color: string; bg: string }> = {
  open:       { icon: <Search size={11} />,  label: 'Finding Driver',    color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  assigned:   { icon: <Car size={11} />,     label: 'Driver Coming',     color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  in_transit: { icon: <Truck size={11} />,   label: 'On the Way',        color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  delivered:  { icon: <Package size={11} />, label: 'Arrived — Pay Now', color: 'var(--color-purple)', bg: 'var(--color-purple-bg)' },
  cancelled:  { icon: <></>,                 label: 'Cancelled',         color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

const TYPE_META: Record<string, { icon: JSX.Element; label: string }> = {
  standard: { icon: <Truck size={14} />,     label: 'Standard' },
  fast:     { icon: <Zap size={14} />,       label: 'Fast' },
  cold:     { icon: <Snowflake size={14} />, label: 'Cool Transport' },
};

export default async function BuyerDeliveriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: deliveries } = await (supabase.from as any)('delivery_requests')
    .select(`
      id, pickup_district, pickup_location, dropoff_district, dropoff_location,
      cargo_kg, cargo_type, delivery_type, estimated_fare, distance_km,
      commission_amount, driver_earnings,
      status, payment_status, pickup_date, transporter_id,
      accepted_at, picked_up_at, delivered_at, created_at,
      transporter:profiles!delivery_requests_transporter_profile_fkey(full_name, phone_number, verification_level)
    `)
    .eq('requester_id', user.id)
    .or('requester_role.eq.buyer,requester_role.is.null')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = deliveries ?? [];

  // vehicles has no direct FK to delivery_requests (both reference
  // auth.users independently), so it can't be embedded in the query above —
  // fetch separately and join in memory by transporter user_id.
  const transporterIds = [...new Set(rows.map((d: any) => d.transporter_id).filter(Boolean))];
  const { data: vehicleRows } = transporterIds.length
    ? await (supabase.from as any)('vehicles')
        .select('user_id, vehicle_type, plate_number, make_model, is_cold_capable')
        .in('user_id', transporterIds)
    : { data: [] };
  const vehicleByUser = new Map((vehicleRows ?? []).map((v: any) => [v.user_id, v]));

  const active    = rows.filter((d: any) => ['open','assigned','in_transit'].includes(d.status));
  const delivered = rows.filter((d: any) => d.status === 'delivered');
  const past      = rows.filter((d: any) => d.status === 'cancelled');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            My Deliveries
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Track and pay for your deliveries</p>
        </div>
        <Link href="/buyer/deliveries/new"
          style={{ padding: '9px 16px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New
        </Link>
      </div>

      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Truck size={48} /></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>No deliveries yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Request a delivery to move goods between districts</p>
          <Link href="/buyer/deliveries/new"
            style={{ display: 'inline-block', padding: '11px 22px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Request Delivery →
          </Link>
        </div>
      )}

      {/* Active & in-transit */}
      {active.length > 0 && (
        <Section title="Active" count={active.length}>
          {active.map((d: any) => <DeliveryRow key={d.id} d={d} vehicle={vehicleByUser.get(d.transporter_id)} />)}
        </Section>
      )}

      {/* Arrived — needs payment */}
      {delivered.length > 0 && (
        <Section title="Delivered — Payment Due" count={delivered.length} highlight>
          {delivered.map((d: any) => <DeliveryRow key={d.id} d={d} vehicle={vehicleByUser.get(d.transporter_id)} showPay />)}
        </Section>
      )}

      {/* Past / cancelled */}
      {past.length > 0 && (
        <Section title="Cancelled" count={past.length}>
          {past.map((d: any) => <DeliveryRow key={d.id} d={d} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, highlight, children }: { title: string; count: number; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
        background: highlight ? 'var(--color-purple-bg)' : 'transparent',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? 'var(--color-purple)' : C.text, margin: 0 }}>{title}</p>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: highlight ? 'var(--color-purple-bg)' : 'var(--color-surface-2)', color: highlight ? 'var(--color-purple)' : C.muted }}>
          {count}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DeliveryRow({ d, vehicle, showPay }: { d: any; vehicle?: any; showPay?: boolean }) {
  const st   = STATUS_CFG[d.status] ?? STATUS_CFG.open;
  const tm   = TYPE_META[d.delivery_type] ?? TYPE_META.standard;
  const paid = d.payment_status === 'paid';
  const canTrack = ['assigned', 'in_transit'].includes(d.status) && d.transporter;

  return (
    <div style={{ padding: '15px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Route + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ display: 'flex', color: 'var(--d-muted)' }}>{tm.icon}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            {d.pickup_district} → {d.dropoff_district}
          </p>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {st.icon} {paid ? 'Paid' : st.label}
          </span>
        </div>

        {/* Details */}
        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 4px' }}>
          {d.cargo_kg} kg {d.cargo_type ? `· ${d.cargo_type}` : ''} · {tm.label} · ~{d.distance_km} km
        </p>

        {/* Fare */}
        <p style={{ fontSize: 12, fontWeight: 700, color: C.green, margin: '0 0 4px' }}>
          UGX {Number(d.estimated_fare).toLocaleString()}
        </p>

        {/* Driver info */}
        {d.transporter && (
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={11} />Driver: {d.transporter.full_name ?? 'Assigned'}
            {d.transporter.phone_number && ` · ${d.transporter.phone_number}`}
          </p>
        )}

        {/* Live location — helps the driver find you without a phone call while driving */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ShareLocationButton
            deliveryId={d.id}
            active={['assigned', 'in_transit'].includes(d.status) && !!d.transporter}
            autoStart
            label="location visible to driver"
          />
          {canTrack && (
            <TrackDeliveryButton
              delivery={d}
              driver={{
                name: d.transporter.full_name ?? 'Your driver',
                phone: d.transporter.phone_number,
                vehicleType: vehicle?.vehicle_type,
                plateNumber: vehicle?.plate_number,
                makeModel: vehicle?.make_model,
                isColdCapable: vehicle?.is_cold_capable,
              }}
            />
          )}
        </div>
      </div>

      {/* Pay button */}
      {showPay && !paid && (
        <PayDeliveryButton deliveryId={d.id} amount={Number(d.estimated_fare)} />
      )}
      {paid && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'var(--color-success-bg)', color: 'var(--color-success)', flexShrink: 0 }}>
          <CheckCircle2 size={10} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />Paid
        </span>
      )}
    </div>
  );
}
