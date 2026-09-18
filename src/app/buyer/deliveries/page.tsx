import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PayDeliveryButton } from './PayDeliveryButton';
import { ShareLocationButton } from '@/components/delivery/ShareLocationButton';
import { TrackDeliveryButton } from '@/components/delivery/TrackDeliveryButton';
import { CancelDeliveryButton } from '@/components/delivery/CancelDeliveryButton';
import { DeliveryTrackingMap } from '@/components/delivery/DeliveryTrackingMap';
import { LiveDeliveryStatusBanner } from '@/components/delivery/LiveDeliveryStatusBanner';
import { ShipmentStatusCard } from '@/components/delivery/ShipmentStatusCard';
import type { JSX } from 'react';
import { Truck, Search, Car, Package, Snowflake, Zap, CheckCircle2, User, Phone } from 'lucide-react';
import { getTelUri, formatPhoneDisplay } from '@/lib/phone-dialer';

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
      id, pickup_district, pickup_location, pickup_lat, pickup_lng, dropoff_district, dropoff_location, dropoff_lat, dropoff_lng,
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

  // Selfie photos live in the private kyc-documents bucket, so the raw path
  // on `verifications` can't be shown directly — mint short-lived signed
  // URLs server-side, scoped to only the drivers actually assigned to one of
  // THIS buyer's own deliveries.
  const photoByUser = new Map<string, string>();
  if (transporterIds.length) {
    const service = createServiceRoleClient();
    const { data: verificationRows } = await (service.from as any)('verifications')
      .select('user_id, selfie_url')
      .in('user_id', transporterIds)
      .eq('role', 'transporter')
      .eq('status', 'approved')
      .not('selfie_url', 'is', null);
    await Promise.all((verificationRows ?? []).map(async (v: any) => {
      const { data: signed } = await service.storage.from('kyc-documents').createSignedUrl(v.selfie_url, 3600);
      if (signed?.signedUrl) photoByUser.set(v.user_id, signed.signedUrl);
    }));
  }

  const active    = rows.filter((d: any) => ['open','assigned','in_transit'].includes(d.status));
  const delivered = rows.filter((d: any) => d.status === 'delivered');
  const past      = rows.filter((d: any) => d.status === 'cancelled');

  const featured = active.find((d: any) => d.status === 'in_transit') ?? active.find((d: any) => d.status === 'assigned');
  const FEATURED_PROGRESS: Record<string, number> = { open: 15, assigned: 40, in_transit: 75 };
  const featuredVehicle = featured ? vehicleByUser.get(featured.transporter_id) as any : null;
  const featuredEtaLabel = featured?.distance_km
    ? `~${Math.max(5, Math.round((Number(featured.distance_km) / 24) * 60))} min away`
    : null;
  const featuredRecentUpdate = featured?.updated_at
    ? Date.now() - new Date(featured.updated_at).getTime() < 30 * 60 * 1000
    : false;

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

      {featured && (
        <ShipmentStatusCard
          statusLabel={featured.status === 'in_transit' ? 'Shipment in transit' : 'Driver heading to pickup'}
          referenceNumber={`CRP-UG-${String(featured.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`}
          etaLabel={featuredEtaLabel}
          progressPercent={FEATURED_PROGRESS[featured.status] ?? 40}
          pickupLabel={featured.pickup_district}
          dropoffLabel={featured.dropoff_district}
          rider={featured.transporter ? {
            name: featured.transporter.full_name ?? 'Assigned Driver',
            idLabel: featuredVehicle?.plate_number ? `Plate: ${featuredVehicle.plate_number}` : null,
            avatarUrl: photoByUser.get(featured.transporter_id) ?? null,
          } : null}
          hasRecentUpdate={featuredRecentUpdate}
        />
      )}

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
          {active.map((d: any) => <DeliveryRow key={d.id} d={d} vehicle={vehicleByUser.get(d.transporter_id)} photoUrl={photoByUser.get(d.transporter_id)} />)}
        </Section>
      )}

      {/* Arrived — needs payment */}
      {delivered.length > 0 && (
        <Section title="Delivered — Payment Due" count={delivered.length} highlight>
          {delivered.map((d: any) => <DeliveryRow key={d.id} d={d} vehicle={vehicleByUser.get(d.transporter_id)} photoUrl={photoByUser.get(d.transporter_id)} showPay />)}
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

function DeliveryRow({ d, vehicle, photoUrl, showPay }: { d: any; vehicle?: any; photoUrl?: string; showPay?: boolean }) {
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 8px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={11} />Driver: <strong style={{ color: C.text }}>{d.transporter.full_name ?? 'Assigned'}</strong>
            </p>
            {d.transporter.phone_number && (
              <a
                href={getTelUri(d.transporter.phone_number)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: 'var(--color-primary-bg, #e3efe4)',
                  color: C.greenMed,
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid rgba(22, 107, 58, 0.2)',
                }}
                title={`Call driver directly: ${formatPhoneDisplay(d.transporter.phone_number)}`}
              >
                <Phone size={11} /> Call {formatPhoneDisplay(d.transporter.phone_number)}
              </a>
            )}
          </div>
        )}
        {/* Live Captain Status Alert (Getting Captain near you / Captain reaches in X min) */}
        {['open', 'assigned', 'in_transit'].includes(d.status) && (
          <div style={{ marginBottom: 12 }}>
            <LiveDeliveryStatusBanner
              delivery={d}
              transporter={d.transporter}
              vehicle={vehicle}
              photoUrl={photoUrl}
            />
          </div>
        )}

        {canTrack && (
          <div style={{ height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
            <DeliveryTrackingMap
              deliveryId={d.id}
              pickupDistrict={d.pickup_district}
              dropoffDistrict={d.dropoff_district}
              pickupCoords={d.pickup_lat != null && d.pickup_lng != null ? { lat: d.pickup_lat, lng: d.pickup_lng } : null}
              dropoffCoords={d.dropoff_lat != null && d.dropoff_lng != null ? { lat: d.dropoff_lat, lng: d.dropoff_lng } : null}
              otherPartyLabel={d.transporter?.full_name ?? 'Captain'}
              driverPhone={d.transporter?.phone_number}
              cargoType={d.cargo_type}
              cargoKg={d.cargo_kg}
              deliveryType={d.delivery_type}
            />
          </div>
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
                photoUrl,
              }}
            />
          )}
          <CancelDeliveryButton deliveryId={d.id} status={d.status} route={`${d.pickup_district} → ${d.dropoff_district}`} />
        </div>
      </div>

      {/* Pay button */}
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
