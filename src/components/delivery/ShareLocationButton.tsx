'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
  deliveryId: string;
  /** Only worth offering while the driver still needs to find this person */
  active: boolean;
}

// Lets the buyer/farmer who requested a delivery broadcast their live
// location so the driver can navigate straight to them instead of calling
// for directions while driving. Updates are throttled to once every 10s.
export function ShareLocationButton({ deliveryId, active }: Props) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  function stop() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
    fetch(`/api/deliveries/${deliveryId}/location`, { method: 'DELETE' }).catch(() => {});
  }

  function start() {
    if (!('geolocation' in navigator)) {
      setError('Location is not available on this device/browser.');
      return;
    }
    setError('');
    setSharing(true);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAt.current < 10_000) return; // throttle to 1 update / 10s
        lastSentAt.current = now;
        fetch(`/api/deliveries/${deliveryId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => {
        setError('Could not get your location. Check that location access is allowed for this site.');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
  }

  // Stop tracking if the component unmounts (e.g. navigating away) while sharing
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  if (!active) return null;

  return (
    <div>
      <button
        onClick={() => (sharing ? stop() : start())}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
          cursor: 'pointer', fontSize: 12, fontWeight: 700,
          background: sharing ? 'var(--color-success-bg)' : 'var(--color-primary-bg)',
          color: sharing ? 'var(--color-success)' : 'var(--color-primary-hover)',
        }}
      >
        {sharing ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
        {sharing ? 'Sharing live location' : 'Share my location'}
      </button>
      {error && <p style={{ fontSize: 11, color: 'var(--color-danger)', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}
