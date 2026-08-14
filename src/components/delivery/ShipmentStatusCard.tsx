'use client';

import { Truck, MapPin, Clock } from 'lucide-react';

export interface ShipmentStatusCardProps {
  /** e.g. "Shipment in transit", "Awaiting pickup", "Delivered" */
  statusLabel: string;
  /** Human reference, e.g. "CRP-UG-4829" — pass delivery.id derived, not invented */
  referenceNumber: string;
  /** Pre-formatted ETA string, e.g. "Arriving today · 4:30 PM" — compute from real data upstream */
  etaLabel?: string | null;
  /** 0–100. Caller computes this from real status/GPS progress (see DeliveryTrackingMap's
   *  haversine-based ETA logic for a reference) — this component only renders what it's given. */
  progressPercent: number;
  pickupLabel: string;
  dropoffLabel: string;
  rider?: {
    name: string;
    idLabel?: string | null; // e.g. "Rider #245" or a plate number
    avatarUrl?: string | null;
  } | null;
  /** Shows the "Recent update" pill — pass true when this delivery has a
   *  status/location change newer than the viewer's last visit, not a fixed flag. */
  hasRecentUpdate?: boolean;
}

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ShipmentStatusCard({
  statusLabel,
  referenceNumber,
  etaLabel,
  progressPercent,
  pickupLabel,
  dropoffLabel,
  rider,
  hasRecentUpdate,
}: ShipmentStatusCardProps) {
  const clamped = Math.max(0, Math.min(100, progressPercent));
  const dashOffset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div
      style={{
        borderRadius: 24,
        padding: '22px 22px 20px',
        background: 'linear-gradient(135deg, #0F4C2A 0%, #1B6B3E 55%, #2D8A57 100%)',
        boxShadow: '0 8px 28px rgba(15,76,42,0.28), 0 2px 8px rgba(15,76,42,0.18)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* Subtle decorative field-terrace texture, echoing the brand mark — not photographic, just tone */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.08, pointerEvents: 'none' }}
        width="180" height="180" viewBox="0 0 180 180"
      >
        <path d="M0,120 Q45,90 90,108 Q120,95 150,108 Q160,112 158,120 L158,180 L0,180 Z" fill="#FFFFFF" />
      </svg>

      {hasRecentUpdate && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: '4px 10px', marginBottom: 12,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8BE9A8' }} />
          Recent update
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{statusLabel}</p>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>
            {referenceNumber}
          </p>
          {etaLabel && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}>
              <Clock size={13} /> {etaLabel}
            </p>
          )}
        </div>

        {/* Circular progress */}
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
            <circle
              cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#FFB300" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 400ms ease' }}
            />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>
            {Math.round(clamped)}%
          </span>
        </div>
      </div>

      {/* Route visualization */}
      <div style={{ marginTop: 20, marginBottom: rider ? 18 : 4 }}>
        <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${clamped}%`, background: '#FFB300', borderRadius: 2, transition: 'width 400ms ease' }} />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: '50%', left: `${clamped}%`, transform: 'translate(-50%, -50%)',
              width: 26, height: 26, borderRadius: '50%', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0F4C2A', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            <Truck size={14} />
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)', maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pickupLabel}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)', maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <MapPin size={12} /> {dropoffLabel}
          </span>
        </div>
      </div>

      {/* Rider */}
      {rider && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
          {rider.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rider.avatarUrl} alt={rider.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {rider.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rider.name}{rider.idLabel ? ` · ${rider.idLabel}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
