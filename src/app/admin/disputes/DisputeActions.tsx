'use client';

import { useState } from 'react';

interface Props {
  disputeId: string;
  currentStatus: string;
  orderId: string | null;
}

const REVIEW_TRANSITIONS: Record<string, { action: string; label: string; next: string; color: string }[]> = {
  open:         [{ action: 'review', label: 'Start Review', next: 'under_review', color: 'var(--color-harvest)' },
                 { action: 'close',  label: 'Close',        next: 'closed',       color: 'var(--d-muted)'       }],
};

export function DisputeActions({ disputeId, currentStatus, orderId }: Props) {
  const [status, setStatus]   = useState(currentStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function act(body: Record<string, unknown>, next: string, key: string) {
    setLoading(key);
    setError(null);
    const res = await fetch('/api/admin/disputes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: disputeId, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(next);
    } else {
      setError(json.error ?? 'Action failed');
    }
    setLoading(null);
  }

  const btnStyle = (color: string) => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
    border: `1px solid ${color}`, background: 'transparent', color,
    cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
  });

  if (status === 'under_review') {
    return (
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex gap-2">
          <button disabled={!!loading || !orderId} title={!orderId ? 'No order linked to this dispute' : 'Refund the buyer'}
            onClick={() => act({ action: 'resolve', outcome: 'refund_buyer' }, 'resolved', 'refund')}
            style={btnStyle('var(--color-danger)')}>
            {loading === 'refund' ? 'Refunding…' : 'Refund Buyer'}
          </button>
          <button disabled={!!loading || !orderId} title={!orderId ? 'No order linked to this dispute' : 'Release payment to the farmer'}
            onClick={() => act({ action: 'resolve', outcome: 'release_to_farmer' }, 'resolved', 'release')}
            style={btnStyle('var(--color-success)')}>
            {loading === 'release' ? 'Releasing…' : 'Release to Farmer'}
          </button>
          <button disabled={!!loading}
            onClick={() => act({ action: 'close' }, 'closed', 'close')}
            style={btnStyle('var(--d-muted)')}>
            Close
          </button>
        </div>
        {error && <p style={{ fontSize: 10, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      </div>
    );
  }

  const buttons = REVIEW_TRANSITIONS[status];
  if (!buttons?.length) return null;

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="flex gap-2">
        {buttons.map(({ action, label, next, color }) => (
          <button key={action} disabled={!!loading} onClick={() => act({ action }, next, action)} style={btnStyle(color)}>
            {label}
          </button>
        ))}
      </div>
      {error && <p style={{ fontSize: 10, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
    </div>
  );
}
