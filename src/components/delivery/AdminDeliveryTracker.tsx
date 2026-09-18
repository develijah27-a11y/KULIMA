'use client';

import { useState } from 'react';
import { Radio, X, Navigation2 } from 'lucide-react';
import { DeliveryTrackingMap } from './DeliveryTrackingMap';

interface Props {
  deliveryId: string;
  status: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  transporterName?: string | null;
  transporterPhone?: string | null;
  requesterName?: string | null;
  cargoType?: string | null;
  cargoKg?: number | null;
  deliveryType?: string | null;
}

export function AdminDeliveryTracker({
  deliveryId,
  status,
  pickupDistrict,
  dropoffDistrict,
  pickupCoords,
  dropoffCoords,
  transporterName,
  transporterPhone,
  requesterName,
  cargoType,
  cargoKg,
  deliveryType,
}: Props) {
  const [open, setOpen] = useState(false);
  const isActive = status === 'assigned' || status === 'in_transit';

  if (!isActive) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 8,
          background: 'var(--color-primary-bg, #E8F5E9)',
          color: 'var(--color-primary, #166B3A)',
          fontSize: 11,
          fontWeight: 800,
          border: '1px solid rgba(22, 107, 58, 0.25)',
          cursor: 'pointer',
          marginTop: 6,
        }}
        title="Supervise Live Transporter & Requester GPS Stream"
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#16A34A',
            display: 'inline-block',
            boxShadow: '0 0 6px #16A34A',
          }}
        />
        <Navigation2 size={11} /> Live Radar Map
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 780,
              background: 'var(--d-card, #FFFFFF)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--d-border, rgba(255,255,255,0.2))',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #064E3B 0%, #042F2E 100%)',
                color: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: 999, color: '#A7F3D0' }}>
                    Admin Telemetry Control
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    #{deliveryId.slice(0, 8)}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '3px 0 0', color: '#FFFFFF' }}>
                  {pickupDistrict} → {dropoffDistrict} ({cargoKg ? `${cargoKg} kg` : ''} {cargoType ?? 'Cargo'})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Map Frame */}
            <div style={{ height: 440, position: 'relative', width: '100%' }}>
              <DeliveryTrackingMap
                deliveryId={deliveryId}
                pickupDistrict={pickupDistrict}
                dropoffDistrict={dropoffDistrict}
                pickupCoords={pickupCoords}
                dropoffCoords={dropoffCoords}
                otherPartyLabel={transporterName ?? requesterName ?? 'Transporter'}
                driverPhone={transporterPhone}
                cargoType={cargoType}
                cargoKg={cargoKg}
                deliveryType={deliveryType}
                viewerRole="requester"
                onClose={() => setOpen(false)}
              />
            </div>

            {/* Modal Footer Info */}
            <div
              style={{
                padding: '12px 20px',
                background: 'var(--d-card, #FFFFFF)',
                borderTop: '1px solid var(--d-border, rgba(0,0,0,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12,
                color: 'var(--d-text, #0F172A)',
              }}
            >
              <div>
                <strong>Driver:</strong> {transporterName ?? 'Assigned'} · <strong>Requester:</strong> {requesterName ?? 'Client'}
              </div>
              <div style={{ color: 'var(--d-muted, #64748B)', fontSize: 11 }}>
                Live GPS stream auto-updates every 3.5 seconds
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
