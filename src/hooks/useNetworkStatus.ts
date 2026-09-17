'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, flushQueue, onQueueChanged } from '@/lib/db';
import { getQueuedFarms, onFarmQueueChanged, syncQueuedFarms } from '@/lib/offline-farm-queue';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const refreshCount = useCallback(async () => {
    const queueCount = await getPendingCount();
    const farmCount = getQueuedFarms().length;
    setPendingCount(queueCount + farmCount);
  }, []);

  const sync = useCallback(async () => {
    setStatus('syncing');
    const [farmRes, queueRes] = await Promise.allSettled([
      syncQueuedFarms(),
      flushQueue(),
    ]);
    const farmsSynced = farmRes.status === 'fulfilled' ? farmRes.value.synced : 0;
    const recordsSynced = queueRes.status === 'fulfilled' ? queueRes.value.synced : 0;
    await refreshCount();
    setLastSynced(new Date());
    setStatus('online');
    return farmsSynced + recordsSynced;
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

    const unsubQueue = onQueueChanged(refreshCount);
    const unsubFarms = onFarmQueueChanged(refreshCount);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      unsubQueue();
      unsubFarms();
    };
  }, [sync, refreshCount]);

  return { status, pendingCount, lastSynced, sync, refreshCount };
}
