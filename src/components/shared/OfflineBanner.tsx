'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

// Mounted once in the root layout, alongside ServiceWorkerRegistrar and
// OfflineSyncManager. Covers the common real-world case — a farmer already
// using the app loses signal mid-session — with a plain online/offline
// listener, no service worker involved. This deliberately does NOT attempt
// to replace the browser's own native "can't connect" interstitial on a
// cold load with zero connectivity; that would require a service worker
// intercepting the failed navigation, and that exact mechanism has already
// caused two real outages in this app (navigation hijacking, then a stale
// worker serving the "can't connect" state itself) — skipped by explicit
// choice rather than attempted again here.
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false); // safe default for SSR
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    function onOffline() {
      setIsOffline(true);
      setShowSyncing(false);
    }
    function onOnline() {
      setIsOffline(false);
      // Genuinely true, not just a reassuring phrase — coming back online
      // is exactly when OfflineSyncManager replays any farm records queued
      // while offline (see offline-farm-queue.ts).
      setShowSyncing(true);
      setTimeout(() => setShowSyncing(false), 4000);
    }

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!isOffline && !showSyncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '9px 16px',
        background: isOffline ? 'var(--color-harvest)' : 'var(--color-success)',
        color: '#fff',
        fontSize: 13, fontWeight: 700,
        transition: 'background-color 0.2s',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>You're offline — some features won't work until you're back online</span>
        </>
      ) : (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Back online — syncing…</span>
        </>
      )}
    </div>
  );
}
