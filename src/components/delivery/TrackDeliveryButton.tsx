'use client';

import { useState, useEffect } from 'react';
import { Navigation2 } from 'lucide-react';
import { DriverTrackingSheet } from './DriverTrackingSheet';

interface Props {
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
  };
  driver: {
    name: string;
    phone?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
    makeModel?: string | null;
    isColdCapable?: boolean;
    photoUrl?: string | null;
  };
}

// Buyer/farmer-side entry point for the live tracking sheet — shown once a
// driver is assigned. The requester's own location is only broadcast while
// this is open (shareOwnLocation), matching the existing ShareLocationButton
// behavior of being opt-in-while-needed rather than always-on.
//
// The driver's position itself is visible without opening anything — a
// lightweight poll runs the moment this mounts (i.e. as soon as a driver is
// matched) and shows a live one-line status right on the button.
//
// This component is only ever rendered once a driver has already accepted
// the job (delivery.status is 'assigned' or 'in_transit' — see canTrack in
// the callers), so its status text must never say "looking for a driver":
// that copy previously fired whenever the driver just hadn't broadcast a
// live position yet (e.g. hasn't opened their own tracking sheet), which
// read as "still searching" right next to a "Driver Coming" badge that
// already said otherwise — a driver had been found, just not located yet.
const firstName = (name: string) => name.split(' ')[0];
const acceptedLabel = (name: string) => `${firstName(name)} accepted — getting ready`;
const enRouteLabel  = (name: string) => `${firstName(name)} is on the way`;

export function TrackDeliveryButton({ delivery, driver }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(acceptedLabel(driver.name));

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/deliveries/${delivery.id}/location`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.location) {
          setStatus(acceptedLabel(driver.name));
        } else {
          // Coarse "has moved recently" freshness check — full ETA math
          // only runs inside the opened sheet (needs the district
          // centroid); here we just need a proximity-flavored status line.
          const ageMin = (Date.now() - new Date(json.location.updated_at).getTime()) / 60000;
          setStatus(ageMin < 5 ? enRouteLabel(driver.name) : acceptedLabel(driver.name));
        }
      } catch { /* transient — next poll retries */ }
    }
    poll();
    const id = setInterval(poll, 20_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [delivery.id, driver.name]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
          cursor: 'pointer', fontSize: 12, fontWeight: 700,
          background: 'var(--color-sky-bg, #E0F2FE)', color: 'var(--color-sky, #0EA5E9)',
        }}
      >
        <Navigation2 size={13} /> {status}
      </button>
      {open && (
        <DriverTrackingSheet
          open={open}
          onClose={() => setOpen(false)}
          delivery={{ ...delivery, is_cold_capable: driver.isColdCapable }}
          otherParty={{
            name: driver.name,
            phone: driver.phone,
            role: 'driver',
            vehicleType: driver.vehicleType,
            plateNumber: driver.plateNumber,
            makeModel: driver.makeModel,
            photoUrl: driver.photoUrl,
          }}
          shareOwnLocation={['open', 'assigned'].includes(delivery.status)}
        />
      )}
    </>
  );
}
