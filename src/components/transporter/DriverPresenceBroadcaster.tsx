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
    <div style={{
      position: 'fixed', bottom: 84, right: 16, zIndex: 40,
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, boxShadow: 'var(--d-shadow-card)',
      background: status === 'denied' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
      color: status === 'denied' ? 'var(--color-danger)' : 'var(--color-success)',
    }}>
      {status === 'denied'
        ? <><MapPinOff size={12} /> Location blocked — enable it to appear on the map</>
        : <><Radio size={12} className="animate-pulse" /> Visible to nearby requesters</>}
    </div>
  );
}
