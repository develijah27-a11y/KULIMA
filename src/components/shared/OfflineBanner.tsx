'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Loader2, CloudUpload } from 'lucide-react';
import { getPendingCount, onQueueChanged } from '@/lib/db';
import { getQueuedFarms, onFarmQueueChanged } from '@/lib/offline-farm-queue';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showSyncing, setShowSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    async function updateCount() {
      const dbPending = await getPendingCount();
      const farmPending = getQueuedFarms().length;
      setPendingCount(dbPending + farmPending);
    }
    updateCount();

    const unsubQueue = onQueueChanged(updateCount);
    const unsubFarms = onFarmQueueChanged(updateCount);

    function onOffline() {
      setIsOffline(true);
      setShowSyncing(false);
      updateCount();
    }

    function onOnline() {
      setIsOffline(false);
      setShowSyncing(true);
      setTimeout(() => setShowSyncing(false), 4500);
      updateCount();
    }

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      unsubQueue();
      unsubFarms();
    };
  }, []);

  if (!isOffline && !showSyncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 16px',
        background: isOffline ? 'var(--color-harvest, #D97706)' : 'var(--color-success, #166B3A)',
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'background-color 0.2s',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>
            {pendingCount > 0
              ? `You're offline — ${pendingCount} change${pendingCount === 1 ? '' : 's'} saved on device`
              : "You're offline — actions will save locally until signal returns"}
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(0,0,0,0.2)',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
              }}
            >
              <CloudUpload size={11} /> Queued
            </span>
          )}
        </>
      ) : (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Back online — syncing saved records…</span>
        </>
      )}
    </div>
  );
}
