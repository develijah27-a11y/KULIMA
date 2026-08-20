'use client';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { MapPin, Clock, Package } from 'lucide-react';
import type { FareBreakdown, DeliveryType } from '@/lib/delivery-pricing';
import { DELIVERY_TYPE_META } from '@/lib/delivery-pricing';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  deliveryType: DeliveryType;
  fare: FareBreakdown;
  route: { pickupDistrict: string; dropoffDistrict: string };
  cargo: { kg: number; type?: string | null };
}

// Final confirmation step before a delivery request goes live — a
// ride-hailing-style "here's exactly what this costs, confirm to book"
// moment, rather than the fare card being just informational text buried in
// a long form. Reuses calcFare()'s output directly, no separate pricing
// logic here.
export function FareConfirmSheet({ open, onClose, onConfirm, confirming, deliveryType, fare, route, cargo }: Props) {
  const meta = DELIVERY_TYPE_META[deliveryType];

  return (
    <BottomSheet open={open} onClose={onClose} title="Confirm delivery">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 16px', borderRadius: 16, background: meta.bg, marginBottom: 18,
      }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>{meta.icon}</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: meta.color, margin: 0 }}>{meta.label}</p>
        <p style={{ fontSize: 12, color: 'var(--d-muted, #6b7566)', margin: '2px 0 0', textAlign: 'center' }}>
          {route.pickupDistrict} → {route.dropoffDistrict}
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-muted, #6b7566)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>
          Fare breakdown
        </p>
        <Row label="Base fare" value={`UGX ${fare.baseFare.toLocaleString()}`} />
        <Row label="Distance" value={`UGX ${fare.distanceFare.toLocaleString()} (~${fare.distanceKm} km)`} />
        {fare.weightFare > 0 && <Row label="Cargo weight" value={`UGX ${fare.weightFare.toLocaleString()} (${cargo.kg} kg)`} />}
        <div style={{ borderTop: '1px solid var(--d-border, #e4e8e1)', margin: '10px 0' }} />
        <Row label="Total fare" value={`UGX ${fare.totalFare.toLocaleString()}`} bold />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 18, fontSize: 12, color: 'var(--d-muted, #6b7566)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} /> ~{fare.distanceKm} km</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {fare.etaLabel}</span>
        {cargo.type && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Package size={13} /> {cargo.type}</span>}
      </div>

      <p style={{ fontSize: 11, color: 'var(--d-muted, #6b7566)', margin: '0 0 18px' }}>
        Provided estimated price can change based on final distance, road conditions, or a change of pickup/drop-off point. You pay after the driver marks the delivery complete — never up front.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={confirming}
          style={{
            flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--d-border, #e4e8e1)',
            background: 'transparent', color: 'var(--d-text, #182018)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          style={{
            flex: 2, padding: '13px', borderRadius: 12, border: 'none',
            background: confirming ? 'var(--color-surface-2, #f3f5f1)' : 'var(--color-primary, #166B3A)',
            color: confirming ? 'var(--d-muted, #6b7566)' : '#fff', fontWeight: 700, fontSize: 14,
            cursor: confirming ? 'not-allowed' : 'pointer',
          }}
        >
          {confirming ? 'Posting…' : `Confirm — UGX ${fare.totalFare.toLocaleString()}`}
        </button>
      </div>
    </BottomSheet>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 800 : 500, color: bold ? 'var(--d-text, #182018)' : 'var(--d-muted, #6b7566)' }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 13, fontWeight: bold ? 900 : 600, color: bold ? 'var(--color-primary, #166B3A)' : 'var(--d-text, #182018)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}
