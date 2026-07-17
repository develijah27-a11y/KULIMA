'use client';

import { useState } from 'react';
import { Navigation2 } from 'lucide-react';
import { DriverTrackingSheet } from './DriverTrackingSheet';

interface Props {
  delivery: {
    id: string;
    status: string;
    pickup_district: string;
    dropoff_district: string;
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
export function TrackDeliveryButton({ delivery, driver }: Props) {
  const [open, setOpen] = useState(false);

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
        <Navigation2 size={13} /> Track driver
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
