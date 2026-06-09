'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const CFG = {
  online:  { dot: 'var(--color-synced)',  bg: 'var(--color-synced-bg)',  text: 'var(--color-synced)',  label: 'Synced' },
  offline: { dot: 'var(--color-offline)', bg: 'var(--color-offline-bg)', text: 'var(--color-offline)', label: null },
  syncing: { dot: 'var(--color-syncing)', bg: 'var(--color-syncing-bg)', text: 'var(--color-syncing)', label: 'Syncing…' },
} as const;

export function OfflineStatusPill() {
  const { status, pendingCount } = useNetworkStatus();
  const c = CFG[status];
  const label = c.label ?? `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: c.bg,
        color: c.text,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
          animation: status === 'syncing' ? 'pulse 1s ease-in-out infinite' : 'none',
        }}
      />
      {label}
    </div>
  );
}
