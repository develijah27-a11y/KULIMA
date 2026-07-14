'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
  deliveryId: string;
  /** Only worth offering while the other party still needs to find this person */
  active: boolean;
  /** Start broadcasting immediately without a manual click — used for the
   *  driver side, where sharing position is the expected default once a job
   *  is accepted, not an opt-in the way it is for the requester. */
  autoStart?: boolean;
  /** Override the button copy — defaults to the requester-facing wording */
  label?: string;
}

// Lets either party on a delivery (the requester finding a driver, or the
// driver en route to the requester) broadcast their live location so the
// other side can see it instead of relying on a phone call. Updates are
// throttled to once every 10s. Which delivery_locations row this writes to
// (and who can read it) is entirely governed by RLS, keyed on the caller's
// own user_id — see /api/deliveries/[id]/location.
export function ShareLocationButton({ deliveryId, active, autoStart, label }: Props) {
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

  // Auto-start once, when this becomes active (e.g. a driver's job flips to
  // 'assigned') — don't re-trigger on every re-render.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && active && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, active]);

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
        {sharing ? (label ? `Sharing — ${label}` : 'Sharing live location') : (label ?? 'Share my location')}
      </button>
      {error && <p style={{ fontSize: 11, color: 'var(--color-danger)', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}
