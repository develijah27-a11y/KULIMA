'use client';

import { useEffect, useState, useRef } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false); // safe default for SSR
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    // Read navigator.onLine only in the browser, after hydration
    setIsOffline(!navigator.onLine);

    const onOffline = () => setIsOffline(true);
    const onOnline = () => {
      setIsOffline(false);
      setShowSyncing(true);
      const t = setTimeout(() => setShowSyncing(false), 4000);
      return () => clearTimeout(t);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!isOffline && !showSyncing) return null;

  const isSyncing = showSyncing && !isOffline;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-300',
        isOffline ? 'bg-clay text-cream' : 'bg-sprout text-soil'
      )}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>You're offline — changes will sync when reconnected</span>
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
