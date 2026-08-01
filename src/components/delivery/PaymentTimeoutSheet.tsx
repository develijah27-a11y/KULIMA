'use client';

/**
 * PaymentTimeoutSheet
 * ────────────────────
 * Shown immediately when a driver is assigned to a delivery.
 * Blocks further navigation until the user either pays or cancels.
 * Displays a live countdown to auto-cancellation.
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import { secondsUntilCancel, DELIVERY_TIMEOUT } from '@/lib/delivery-timeout';

interface Props {
  deliveryId: string;
  assignedAt: string;
  estimatedFare: number;
  cargoType?: string;
  cargoKg?: number;
  isInTransit?: boolean;
  onPayClick: () => void;
  onDismiss?: () => void;
}

function fmt(secs: number): string {
  const s = Math.max(0, secs);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function urgencyColor(secsLeft: number): string {
  if (secsLeft <= 60)  return 'var(--color-danger)';
  if (secsLeft <= 120) return 'var(--color-harvest)';
  return 'var(--color-success)';
}

export function PaymentTimeoutSheet({
  deliveryId,
  assignedAt,
  estimatedFare,
  cargoType,
  cargoKg,
  isInTransit = false,
  onPayClick,
  onDismiss,
}: Props) {
  const [secsLeft, setSecsLeft] = useState(() =>
    secondsUntilCancel(assignedAt, isInTransit)
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const tick = () =>
      setSecsLeft(secondsUntilCancel(assignedAt, isInTransit));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [assignedAt, isInTransit]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (dismissed || secsLeft <= -60) return null;

  const color = urgencyColor(secsLeft);
  const expired = secsLeft <= 0;
  const totalSecs = isInTransit
    ? DELIVERY_TIMEOUT.CANCEL_SECS + DELIVERY_TIMEOUT.IN_TRANSIT_GRACE_EXTRA
    : DELIVERY_TIMEOUT.CANCEL_SECS;
  const pct = Math.max(0, Math.min(100, (secsLeft / totalSecs) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Payment required"
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom, 0)',
      }}
    >
      <div style={{
        background: 'var(--d-card)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 32px',
        width: '100%', maxWidth: 480,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--d-border)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: expired ? 'var(--color-danger-bg)' : 'var(--color-harvest-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {expired
              ? <AlertTriangle size={22} style={{ color: 'var(--color-danger)' }} />
              : <CreditCard size={22} style={{ color: 'var(--color-harvest)' }} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>
              {expired ? 'Payment overdue' : 'Payment required'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '3px 0 0' }}>
              {cargoType && cargoKg
                ? `${cargoKg} kg of ${cargoType}`
                : 'Your delivery request'}
            </p>
          </div>
          {onDismiss && !expired && (
            <button
              onClick={handleDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', padding: 4 }}
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Amount */}
        <div style={{
          background: 'var(--color-surface-2)', borderRadius: 12,
          padding: '14px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--d-muted)', fontWeight: 600 }}>Amount due</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--d-text)', letterSpacing: '-0.02em' }}>
            UGX {Math.round(estimatedFare).toLocaleString()}
          </span>
        </div>

        {/* Countdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} style={{ color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-muted)' }}>
                {expired ? 'Cancellation pending' : 'Auto-cancel in'}
              </span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {expired ? 'Overdue' : fmt(secsLeft)}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 99 }}>
            <div style={{
              height: 6, borderRadius: 99,
              width: `${pct}%`,
              background: color,
              transition: 'width 1s linear, background 0.5s ease',
            }} />
          </div>
          {isInTransit && (
            <p style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>
              Extended window — your driver has already started moving.
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={onPayClick}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: expired ? 'var(--color-danger)' : 'var(--color-primary)',
            color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <CreditCard size={18} />
          Pay UGX {Math.round(estimatedFare).toLocaleString()} now
        </button>

        <p style={{ fontSize: 11, color: 'var(--d-muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
          Paid via your AgriNova wallet · Driver starts moving after confirmation
        </p>
      </div>
    </div>
  );
}
