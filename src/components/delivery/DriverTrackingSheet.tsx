'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DeliveryTrackingMap } from './DeliveryTrackingMap';
import { ShareLocationButton } from './ShareLocationButton';
import { Phone, MessageCircle, Truck, Bike, Car, Package, Snowflake, User } from 'lucide-react';
import { UGANDA_DISTRICTS } from '@/lib/districts';

const VEHICLE_ICON: Record<string, React.ReactNode> = {
  motorcycle: <Bike size={22} />,
  pickup:     <Package size={22} />,
  minivan:    <Car size={22} />,
  truck:      <Truck size={22} />,
  lorry:      <Truck size={22} />,
  tractor:    <Truck size={22} />,
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  open: boolean;
  onClose: () => void;
  delivery: {
    id: string;
    status: string;
    pickup_district: string;
    dropoff_district: string;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    cargo_type?: string | null;
    cargo_kg?: number | null;
    is_cold_capable?: boolean;
  };
  /** The party being tracked, from the current viewer's side — the driver
   *  when a buyer/farmer is looking, or the requester when a driver is. */
  otherParty: {
    name: string;
    phone?: string | null;
    role: 'driver' | 'requester';
    vehicleType?: string | null;
    plateNumber?: string | null;
    makeModel?: string | null;
    /** The selfie submitted with the driver's transporter verification —
     *  lets a waiting buyer/farmer recognize the actual person, not just a
     *  vehicle icon, before they arrive. */
    photoUrl?: string | null;
  };
  /** Whether THIS viewer should broadcast their own position while the sheet is open */
  shareOwnLocation?: boolean;
}

// The "Your driver arrives in N min" live-tracking sheet — shown to a buyer/
// farmer once a transporter is assigned, and symmetrically to a driver
// tracking the requester's pickup location. Distance/ETA are computed from
// whatever live position is currently being broadcast (see
// DeliveryTrackingMap + /api/deliveries/[id]/location); until the other
// party's device has sent a first fix, this shows a friendly "waiting for
// location" state instead of a fabricated number.
export function DriverTrackingSheet({ open, onClose, delivery, otherParty, shareOwnLocation }: Props) {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const pickupCoords  = delivery.pickup_lat != null && delivery.pickup_lng != null
    ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng } : null;
  const dropoffCoords = delivery.dropoff_lat != null && delivery.dropoff_lng != null
    ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng } : null;

  const target = delivery.status === 'in_transit'
    ? (dropoffCoords ?? UGANDA_DISTRICTS[delivery.dropoff_district])
    : (pickupCoords ?? UGANDA_DISTRICTS[delivery.pickup_district]);

  function handlePosition(pos: { lat: number; lng: number; updatedAt: string } | null) {
    setLastSeen(pos?.updatedAt ?? null);
    if (!pos || !target) { setEtaMin(null); return; }
    const km = haversineKm(pos.lat, pos.lng, target.lat, target.lng);
    // ~22 km/h average — mixed rural/urban Uganda roads, deliberately
    // conservative rather than optimistic about ETA.
    setEtaMin(Math.max(1, Math.round((km / 22) * 60)));
  }

  // Staged messaging (matches the ride-hailing pattern this was modeled
  // on): "looking for/waiting on a live position" before the first fix
  // arrives, then a concrete "near you, on the way" + ETA once it does —
  // never a bare number with no framing.
  const headline = otherParty.role === 'driver'
    ? (etaMin != null
        ? (etaMin <= 3 ? `${otherParty.name} is near you — arriving any moment` : `${otherParty.name} is on the way — arrives in ${etaMin} min`)
        : `Looking for ${otherParty.name}'s location…`)
    : (etaMin != null
        ? (etaMin <= 3 ? "You're almost at pickup" : `You'll reach pickup in ${etaMin} min`)
        : 'Waiting for your location…');

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ height: 260, marginBottom: 16, marginLeft: -20, marginRight: -20, marginTop: -8 }}>
        <DeliveryTrackingMap
          deliveryId={delivery.id}
          pickupDistrict={delivery.pickup_district}
          dropoffDistrict={delivery.dropoff_district}
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          otherPartyLabel={otherParty.name}
          onPosition={handlePosition}
        />
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--d-text, #182018)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
        {headline}
      </h3>
      {lastSeen && (
        <p style={{ fontSize: 11.5, color: 'var(--d-muted, #6b7566)', margin: '0 0 16px' }}>
          Last updated {new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {!lastSeen && <div style={{ marginBottom: 16 }} />}

      {/* Vehicle / person card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        background: 'var(--color-surface-2, #f3f5f1)', borderRadius: 12, marginBottom: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary-bg, #e3efe4)',
          color: 'var(--color-primary, #166B3A)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {otherParty.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherParty.photoUrl} alt={otherParty.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : otherParty.role === 'driver'
            ? (VEHICLE_ICON[otherParty.vehicleType ?? ''] ?? <Truck size={22} />)
            : <User size={22} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--d-text, #182018)', margin: 0 }}>
            {otherParty.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--d-muted, #6b7566)', margin: '2px 0 0' }}>
            {otherParty.role === 'driver'
              ? [otherParty.makeModel, otherParty.plateNumber].filter(Boolean).join(' · ') || 'Assigned driver'
              : `${delivery.cargo_kg ?? ''} kg${delivery.cargo_type ? ` · ${delivery.cargo_type}` : ''}`}
          </p>
        </div>
        {delivery.is_cold_capable && (
          <span style={{ color: '#0EA5E9', flexShrink: 0 }} title="Cold-chain vehicle"><Snowflake size={16} /></span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        {otherParty.phone && (
          <a
            href={`tel:${otherParty.phone}`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px', borderRadius: 12, background: 'var(--color-primary, #166B3A)', color: '#fff',
              fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
            }}
          >
            <Phone size={15} /> Call {otherParty.role === 'driver' ? 'driver' : 'buyer'}
          </a>
        )}
        <a
          href={`sms:${otherParty.phone ?? ''}`}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '12px', borderRadius: 12, background: 'var(--color-surface-2, #f3f5f1)',
            color: 'var(--d-text, #182018)', fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
          }}
        >
          <MessageCircle size={15} /> Message
        </a>
      </div>

      {shareOwnLocation && (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <ShareLocationButton
            deliveryId={delivery.id}
            active
            autoStart
            label={otherParty.role === 'driver' ? 'sharing pickup location' : 'sharing your position'}
          />
        </div>
      )}
    </BottomSheet>
  );
}
