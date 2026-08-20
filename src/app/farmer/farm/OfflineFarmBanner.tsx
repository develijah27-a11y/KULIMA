'use client';

import { useEffect, useState, useCallback } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { getQueuedFarms, onFarmQueueChanged, syncQueuedFarms } from '@/lib/offline-farm-queue';

// Only ever visible when there's actually something queued — most
// farmers with a working connection will never see this render anything.
export function OfflineFarmBanner() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => setCount(getQueuedFarms().length), []);

  useEffect(() => {
    refresh();
    return onFarmQueueChanged(refresh);
  }, [refresh]);

  if (count === 0) return null;

  async function syncNow() {
    setSyncing(true);
    await syncQueuedFarms();
    setSyncing(false);
    refresh();
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 12, background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)',
      fontSize: 12.5, fontWeight: 600,
    }}>
      <CloudOff size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {count} farm{count === 1 ? '' : 's'} saved on this device, waiting to sync
      </span>
      <button
        onClick={syncNow}
        disabled={syncing}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          border: 'none', background: 'var(--color-harvest)', color: '#fff', fontSize: 11.5, fontWeight: 700,
          cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.7 : 1, flexShrink: 0,
        }}
      >
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  );
}
