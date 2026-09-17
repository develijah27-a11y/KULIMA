'use client';

import { useState } from 'react';

interface Props {
  flagId: string;
  currentStatus: string;
}

const TRANSITIONS: Record<string, { action: string; label: string; next: string; color: string }[]> = {
  open:          [{ action: 'investigate', label: 'Investigate', next: 'investigating', color: 'var(--color-harvest)' },
                  { action: 'dismiss',     label: 'Dismiss',     next: 'dismissed',     color: 'var(--d-muted)'      }],
  investigating: [{ action: 'resolve',     label: 'Resolve',     next: 'resolved',      color: 'var(--color-success)' },
                  { action: 'dismiss',     label: 'Dismiss',     next: 'dismissed',      color: 'var(--d-muted)'      }],
};

export function FraudActions({ flagId, currentStatus }: Props) {
  const [status, setStatus]   = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function act(action: string, next: string) {
    if (action === 'terminate' && !confirm('Are you sure you want to PERMANENTLY TERMINATE this account and deactivate their listings?')) {
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/admin/fraud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: flagId, action }),
      });
      setStatus(next);
    } finally {
      setLoading(false);
    }
  }

  const buttons = TRANSITIONS[status] ?? [];

  return (
    <div className="flex gap-2 shrink-0 items-center flex-wrap">
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

      {status !== 'resolved' && status !== 'dismissed' && (
        <>
          <button
            disabled={loading}
            onClick={() => act('reinstate', 'resolved')}
            style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: `1px solid var(--color-success)`, background: 'var(--color-success-bg)', color: 'var(--color-success)',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            Lift Ban
          </button>
          <button
            disabled={loading}
            onClick={() => act('terminate', 'resolved')}
            style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: `1px solid var(--color-danger)`, background: 'var(--color-danger)', color: '#fff',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            Terminate
          </button>
        </>
      )}
    </div>
  );
}

