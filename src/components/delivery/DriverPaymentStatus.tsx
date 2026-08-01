'use client';

/**
 * DriverPaymentStatus
 * ────────────────────
 * Shows on the transporter's active delivery card.
 * Live countdown / status while waiting for payment from the requester.
 * Polls /api/deliveries/:id/payment-status every 30s to detect confirmation.
 */

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { secondsUntilCancel, DELIVERY_TIMEOUT } from '@/lib/delivery-timeout';

interface Props {
  deliveryId: string;
  assignedAt: string;
  paymentStatus: string;
  isInTransit?: boolean;
}

function fmt(secs: number): string {
  const s = Math.max(0, secs);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function DriverPaymentStatus({
  deliveryId,
  assignedAt,
  paymentStatus: initialStatus,
  isInTransit = false,
}: Props) {
  const [secsLeft, setSecsLeft] = useState(() =>
    secondsUntilCancel(assignedAt, isInTransit)
  );
  const [status, setStatus] = useState(initialStatus);

  // Live countdown
  useEffect(() => {
    if (status === 'paid') return;
    const id = setInterval(() => {
      setSecsLeft(secondsUntilCancel(assignedAt, isInTransit));
    }, 1000);
    return () => clearInterval(id);
  }, [assignedAt, isInTransit, status]);

  // Poll for payment confirmation every 30s
  useEffect(() => {
    if (status === 'paid') return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/deliveries/${deliveryId}/payment-status`);
        const json = await res.json();
        if (json.payment_status === 'paid') setStatus('paid');
      } catch {}
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [deliveryId, status]);

  if (status === 'paid') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        borderRadius: 10, background: 'var(--color-success-bg)',
        marginTop: 8,
      }}>
        <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>
          Payment confirmed — you can start moving
        </p>
      </div>
    );
  }

  const expired = secsLeft <= 0;
  const urgent  = secsLeft <= 60 && !expired;
  const color   = expired ? 'var(--color-danger)' : urgent ? 'var(--color-harvest)' : 'var(--color-sky)';

  const totalSecs = isInTransit
    ? DELIVERY_TIMEOUT.CANCEL_SECS + DELIVERY_TIMEOUT.IN_TRANSIT_GRACE_EXTRA
    : DELIVERY_TIMEOUT.CANCEL_SECS;
  const pct = Math.max(0, Math.min(100, (secsLeft / totalSecs) * 100));

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: expired ? 'var(--color-danger-bg)' : 'var(--color-surface-2)',
      border: `1px solid ${expired ? 'var(--color-danger-border)' : 'var(--d-border)'}`,
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {expired
            ? <AlertTriangle size={13} style={{ color: 'var(--color-danger)' }} />
            : <Clock size={13} style={{ color }} />
          }
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-muted)' }}>
            {expired
              ? 'Awaiting cancellation by system'
              : 'Waiting for customer payment'}
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
          {expired ? 'Overdue' : fmt(secsLeft)}
        </span>
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 99 }}>
        <div style={{
          height: 4, borderRadius: 99, width: `${pct}%`,
          background: color,
          transition: 'width 1s linear',
        }} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>
        {expired
          ? 'The request will be cancelled automatically. Your vehicle will be freed.'
          : `Request cancels if unpaid. You will be notified and freed automatically.`}
      </p>
    </div>
  );
}
