'use client';

import { useState } from 'react';

interface Props {
  disputeId: string;
  currentStatus: string;
}

const TRANSITIONS: Record<string, { action: string; label: string; next: string; color: string }[]> = {
  open:         [{ action: 'review',  label: 'Start Review', next: 'under_review', color: 'var(--color-harvest)'  },
                 { action: 'close',   label: 'Close',        next: 'closed',       color: 'var(--d-muted)'        }],
  under_review: [{ action: 'resolve', label: 'Resolve',      next: 'resolved',     color: 'var(--color-success)'  },
                 { action: 'close',   label: 'Close',        next: 'closed',       color: 'var(--d-muted)'        }],
};

export function DisputeActions({ disputeId, currentStatus }: Props) {
  const [status, setStatus]   = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const buttons = TRANSITIONS[status];
  if (!buttons?.length) return null;

  async function act(action: string, next: string) {
    setLoading(true);
    await fetch('/api/admin/disputes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: disputeId, action }),
    });
    setStatus(next);
    setLoading(false);
  }

  return (
    <div className="flex gap-2 shrink-0">
      {buttons.map(({ action, label, next, color }) => (
        <button
          key={action}
          disabled={loading}
          onClick={() => act(action, next)}
          style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            border: `1px solid ${color}`, background: 'transparent', color,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
