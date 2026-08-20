'use client';

import { useEffect } from 'react';
import { syncQueuedFarms, getQueuedFarms } from '@/lib/offline-farm-queue';
import { showToast } from '@/components/ui/Toast';

// Mounted once in the root layout, next to ServiceWorkerRegistrar. Flushes
// any farm records saved offline (see offline-farm-queue.ts) as soon as
// the app has a connection again — on first load and every time the
// browser regains connectivity — so a farmer never has to remember to go
// back and manually resync.
export function OfflineSyncManager() {
  useEffect(() => {
    async function trySync() {
      if (getQueuedFarms().length === 0) return;
      const { synced } = await syncQueuedFarms();
      if (synced > 0) {
        showToast(`${synced} farm${synced === 1 ? '' : 's'} synced from offline`, 'success');
      }
    }

    trySync();
    window.addEventListener('online', trySync);
    return () => window.removeEventListener('online', trySync);
  }, []);

  return null;
}
