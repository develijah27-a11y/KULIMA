'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, AlertTriangle, X } from 'lucide-react';

interface Props {
  deliveryId: string;
  status: string;
  route: string;
}

const CANCELLABLE = ['open', 'assigned'];

export function CancelDeliveryButton({ deliveryId, status, route }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!CANCELLABLE.includes(status)) return null;

  async function confirmCancel() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to cancel');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '7px 12px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
        }}
      >
        <XCircle size={12} /> Cancel request
      </button>

      {/* Prominently Centered High-Visibility Confirmation Modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Delivery Cancellation"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 440,
              background: 'var(--d-card, #ffffff)',
              borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--d-border, #e5e7eb)',
              padding: '24px',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'var(--color-surface-2, #f3f4f6)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--d-muted, #64748b)',
              }}
            >
              <X size={16} />
            </button>

            {/* Header Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--color-danger-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-danger)',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: 'var(--d-text, #0f172a)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Cancel Delivery Order?
                </h3>
                <p style={{ fontSize: 12, color: 'var(--d-muted, #64748b)', margin: '2px 0 0' }}>
                  Route: <strong>{route}</strong>
                </p>
              </div>
            </div>

            {/* Explanatory Warning Box */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border, rgba(239,68,68,0.2))',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--d-text, #0f172a)', margin: 0, lineHeight: 1.5 }}>
                {status === 'assigned'
                  ? `A transporter has already accepted this delivery. Cancelling now will immediately notify the driver and release any escrow funds back to your wallet.`
                  : `This will permanently cancel your request for this route and stop any drivers from accepting it. Any escrowed funds will be immediately refunded.`}
              </p>
            </div>

            {error && (
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: '0 0 14px',
                }}
              >
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            {/* Action Buttons - Centered and Immediately Visible */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: 'none',
                  background: loading ? 'var(--color-surface-2, #ccc)' : 'var(--color-danger, #ef4444)',
                  color: loading ? 'var(--d-muted, #888)' : '#fff',
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? 'Cancelling Request…' : 'Yes, Confirm Cancellation'}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  border: '1.5px solid var(--d-border, #e2e8f0)',
                  background: 'transparent',
                  color: 'var(--d-text, #0f172a)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                No, Keep This Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
