'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, flushQueue } from '@/lib/db';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    setStatus('syncing');
    const { synced } = await flushQueue();
    await refreshCount();
    setLastSynced(new Date());
    setStatus('online');
    return synced;
  }, [refreshCount]);

  useEffect(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setStatus(isOnline ? 'online' : 'offline');
    refreshCount();

    const goOnline = async () => {
      await sync();
    };
    const goOffline = () => {
      setStatus('offline');
      refreshCount();
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [sync, refreshCount]);

  return { status, pendingCount, lastSynced, sync, refreshCount };
}
