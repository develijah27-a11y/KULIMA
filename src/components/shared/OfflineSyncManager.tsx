'use client';

import { useEffect, useRef } from 'react';
import { syncQueuedFarms, getQueuedFarms } from '@/lib/offline-farm-queue';
import { flushQueue, getPendingCount, onQueueChanged } from '@/lib/db';
import { showToast } from '@/components/ui/Toast';

export function OfflineSyncManager() {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function trySync() {
      if (typeof window === 'undefined' || !navigator.onLine || isSyncingRef.current) return;

      const farmQueueLength = getQueuedFarms().length;
      const pendingDbCount = await getPendingCount();

      if (farmQueueLength === 0 && pendingDbCount === 0) return;

      isSyncingRef.current = true;
      try {
        const [farmResult, queueResult] = await Promise.allSettled([
          syncQueuedFarms(),
          flushQueue(),
        ]);

        const farmsSynced = farmResult.status === 'fulfilled' ? farmResult.value.synced : 0;
        const recordsSynced = queueResult.status === 'fulfilled' ? queueResult.value.synced : 0;
        const totalSynced = farmsSynced + recordsSynced;

        if (totalSynced > 0) {
          showToast(
            `${totalSynced} offline record${totalSynced === 1 ? '' : 's'} synced to cloud`,
            'success'
          );
        }
      } catch (err) {
        console.warn('[OfflineSyncManager] Sync attempt error:', err);
      } finally {
        isSyncingRef.current = false;
      }
    }

    // Try immediately on mount
    trySync();

    // Trigger when connection is restored
    const onOnline = () => {
      // Small 800ms delay to let connection stabilize (especially on 2G/EDGE)
      setTimeout(trySync, 800);
    };
    window.addEventListener('online', onOnline);

    // Trigger when user returns to app tab
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        trySync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Trigger when an offline record is added while online
    const unsubscribeQueue = onQueueChanged(() => {
      if (navigator.onLine) {
        setTimeout(trySync, 500);
      }
    });

    // Periodic heartbeat sync every 60s while online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        trySync();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeQueue();
      clearInterval(interval);
    };
  }, []);

  return null;
}
