'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface Props {
  deliveryId: string;
  status: string;
  route: string;
}

const CANCELLABLE = ['open', 'assigned'];

// Requester-side cancel — only shown while the job hasn't been picked up yet
// (mirrors CANCELLABLE_STATUSES in /api/deliveries/[id]/cancel). Confirms via
// a BottomSheet rather than a native confirm() to match the rest of the
// delivery flow (FareConfirmSheet, DestinationSearchSheet).
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
      <button type="button" onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
        background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
      }}>
        <XCircle size={12} /> Cancel request
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Cancel this delivery?">
        <p style={{ fontSize: 13, color: 'var(--d-muted, #6b7566)', lineHeight: 1.6, margin: 0 }}>
          {status === 'assigned'
            ? `A driver has already accepted this job (${route}). They'll be notified immediately if you cancel.`
            : `This will stop any driver from picking up this job (${route}).`}
        </p>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 5, margin: '12px 0 0' }}>
            <AlertTriangle size={12} /> {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={() => setOpen(false)} disabled={loading} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--d-border, #e4e8e1)',
            background: 'transparent', color: 'var(--d-text, #182018)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Keep it
          </button>
          <button type="button" onClick={confirmCancel} disabled={loading} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: loading ? 'var(--color-surface-2)' : 'var(--color-danger)',
            color: loading ? 'var(--d-muted)' : '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
