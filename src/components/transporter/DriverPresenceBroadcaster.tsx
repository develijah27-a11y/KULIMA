'use client';

import { useEffect, useRef, useState } from 'react';
import { Radio, MapPinOff } from 'lucide-react';

interface Props {
  /** Mirrors vehicles.is_available — broadcasting only ever runs while true. */
  isAvailable: boolean;
}

// Mounted once in the transporter layout so it runs on every page while a
// driver is marked available — no manual toggle, mirrors how a real
// ride-hailing driver app behaves ("online" already implies "visible on the
// map"). Same throttled watchPosition pattern as ShareLocationButton, but
// posts to the general presence endpoint instead of a specific delivery.
export function DriverPresenceBroadcaster({ isAvailable }: Props) {
  const [status, setStatus] = useState<'idle' | 'broadcasting' | 'denied'>('idle');
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!isAvailable) {
      setStatus('idle');
      return;
    }
    if (!('geolocation' in navigator)) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('broadcasting');
        const now = Date.now();
        if (now - lastSentAt.current < 10_000) return; // throttle to 1 update / 10s
        lastSentAt.current = now;
        fetch('/api/transporter/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [isAvailable]);

  if (!isAvailable || status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        background: status === 'denied' ? 'var(--color-danger-bg, #FEF2F2)' : 'var(--color-surface-2, #EAF6EE)',
        border: `1px solid ${status === 'denied' ? 'var(--color-danger, #EF4444)' : 'rgba(22, 107, 58, 0.2)'}`,
        color: status === 'denied' ? 'var(--color-danger, #DC2626)' : 'var(--color-primary, #166B3A)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {status === 'denied' ? (
        <>
          <MapPinOff size={13} className="shrink-0" />
          <span>Location blocked · Enable GPS to appear on map</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <Radio size={12} className="shrink-0 animate-pulse text-emerald-700" />
          <span>Visible to nearby requesters</span>
        </>
      )}
    </div>
  );
}
