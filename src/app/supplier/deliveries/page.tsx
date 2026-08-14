import type { JSX, ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search, Car, Truck, Package, X as XIcon, Zap, Snowflake, User, CheckCircle2 } from 'lucide-react';
import { PayDeliveryButton } from '@/app/buyer/deliveries/PayDeliveryButton';
import { ShareLocationButton } from '@/components/delivery/ShareLocationButton';
import { CancelDeliveryButton } from '@/components/delivery/CancelDeliveryButton';
import { DeliveryTrackingMap } from '@/components/delivery/DeliveryTrackingMap';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)',
};

const STATUS_CFG: Record<string, { icon: JSX.Element; label: string; color: string; bg: string }> = {
  open:       { icon: <Search size={10} />,   label: 'Finding Driver',    color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  assigned:   { icon: <Car size={10} />,      label: 'Driver Coming',     color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  in_transit: { icon: <Truck size={10} />,    label: 'On the Way',        color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  delivered:  { icon: <Package size={10} />,  label: 'Arrived — Pay Now', color: 'var(--color-purple)', bg: 'var(--color-purple-bg)' },
  cancelled:  { icon: <XIcon size={10} />,    label: 'Cancelled',         color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

const TYPE_META: Record<string, { icon: JSX.Element; label: string }> = {
  standard: { icon: <Truck size={14} />,     label: 'Standard' },
  fast:     { icon: <Zap size={14} />,       label: 'Fast' },
  cold:     { icon: <Snowflake size={14} />, label: 'Cool Transport' },
};

export default async function SupplierDeliveriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: deliveries } = await (supabase.from as any)('delivery_requests')
    .select(`
      id, pickup_district, pickup_location, pickup_lat, pickup_lng, dropoff_district, dropoff_location, dropoff_lat, dropoff_lng,
      cargo_kg, cargo_type, delivery_type, estimated_fare, distance_km,
      driver_earnings, status, payment_status, pickup_date, created_at,
      transporter:profiles!delivery_requests_transporter_profile_fkey(full_name, phone_number)
    `)
    .eq('requester_id', user.id)
    .eq('requester_role', 'supplier')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = deliveries ?? [];

  const active    = rows.filter((d: any) => ['open', 'assigned', 'in_transit'].includes(d.status));
  const delivered = rows.filter((d: any) => d.status === 'delivered');
  const past      = rows.filter((d: any) => d.status === 'cancelled');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Deliveries
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Request and track transport for input orders</p>
        </div>
        <Link href="/supplier/deliveries/new"
          style={{ padding: '9px 16px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Request
        </Link>
      </div>

      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Truck size={48} style={{ color: C.muted }} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>No deliveries yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Move input orders to farmers quickly and safely</p>
          <Link href="/supplier/deliveries/new"
            style={{ display: 'inline-block', padding: '11px 22px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Request Delivery →
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <Section title="Active" count={active.length}>
          {active.map((d: any) => <DeliveryRow key={d.id} d={d} />)}
        </Section>
      )}

      {delivered.length > 0 && (
        <Section title="Delivered — Payment Due" count={delivered.length} highlight>
          {delivered.map((d: any) => <DeliveryRow key={d.id} d={d} showPay />)}
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Cancelled" count={past.length}>
          {past.map((d: any) => <DeliveryRow key={d.id} d={d} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, highlight, children }: { title: string; count: number; highlight?: boolean; children: ReactNode }) {
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

function DeliveryRow({ d, showPay }: { d: any; showPay?: boolean }) {
  const st   = STATUS_CFG[d.status] ?? STATUS_CFG.open;
  const tm   = TYPE_META[d.delivery_type] ?? TYPE_META.standard;
  const paid = d.payment_status === 'paid';

  return (
    <div style={{ padding: '15px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: C.muted }}>{tm.icon}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            {d.pickup_district} → {d.dropoff_district}
          </p>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {st.icon} {paid ? 'Paid' : st.label}
          </span>
        </div>

        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 4px' }}>
          {d.cargo_kg} kg {d.cargo_type ? `· ${d.cargo_type}` : ''} · {tm.label} · ~{d.distance_km} km
        </p>

        <p style={{ fontSize: 12, fontWeight: 700, color: C.green, margin: '0 0 4px' }}>
          UGX {Number(d.estimated_fare ?? 0).toLocaleString()}
        </p>

        {d.transporter && (
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={10} /> Driver: {d.transporter.full_name ?? 'Assigned'}
            {d.transporter.phone_number && ` · ${d.transporter.phone_number}`}
          </p>
        )}

        {['assigned', 'in_transit'].includes(d.status) && d.transporter && (
          <div style={{ height: 190, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            <DeliveryTrackingMap
              deliveryId={d.id}
              pickupDistrict={d.pickup_district}
              dropoffDistrict={d.dropoff_district}
              pickupCoords={d.pickup_lat != null && d.pickup_lng != null ? { lat: d.pickup_lat, lng: d.pickup_lng } : null}
              dropoffCoords={d.dropoff_lat != null && d.dropoff_lng != null ? { lat: d.dropoff_lat, lng: d.dropoff_lng } : null}
              otherPartyLabel={d.transporter?.full_name ?? 'Driver'}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ShareLocationButton
            deliveryId={d.id}
            active={['assigned', 'in_transit'].includes(d.status) && !!d.transporter}
            autoStart
            label="location visible to driver"
          />
          <CancelDeliveryButton deliveryId={d.id} status={d.status} route={`${d.pickup_district} → ${d.dropoff_district}`} />
        </div>
      </div>

      {(showPay || (['assigned','in_transit'].includes(d.status) && d.transporter)) && !paid && (
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
