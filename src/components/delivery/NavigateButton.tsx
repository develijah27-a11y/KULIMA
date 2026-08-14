'use client';

import { useEffect, useState } from 'react';
import { Navigation, MapPin } from 'lucide-react';

interface Props {
  deliveryId: string;
  /** Text fallback (e.g. pickup_location/dropoff_location) if nothing more precise is available */
  fallbackAddress: string;
  /** The exact pin captured at request time (LocationPinPicker), if the
   *  requester set one — preferred over the address once no live position
   *  is being shared yet, since it's a real coordinate instead of a
   *  free-text address Google has to guess at. */
  exactCoords?: { lat: number; lng: number } | null;
}

// Hands off to the phone's own Maps app for real spoken turn-by-turn
// directions — safer and far more reliable than trying to reimplement
// navigation inside the browser (no routing engine, no live rerouting, no
// voice guidance exists in this app, and building one is out of scope).
// What this app CAN control is how accurate the destination it hands off
// is: prefer a live-shared position, then the requester's confirmed exact
// pin, and only fall back to a free-text address (which Google then has to
// guess at — often unreliable for rural/informal Ugandan addresses) if
// neither exists.
export function NavigateButton({ deliveryId, fallbackAddress, exactCoords }: Props) {
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/api/deliveries/${deliveryId}/location`);
        const json = await res.json();
        if (!cancelled && json.location) setLiveCoords({ lat: json.location.lat, lng: json.location.lng });
      } catch { /* ignore — falls back to the pin or address */ }
    }
    check();
    const interval = setInterval(check, 20_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [deliveryId]);

  const coords = liveCoords ?? exactCoords ?? null;
  const destination = coords ? `${coords.lat},${coords.lng}` : fallbackAddress;
  const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
        background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 13,
      }}
    >
      <Navigation size={14} />
      Navigate {liveCoords ? '(live location)' : exactCoords ? '(exact pin)' : ''}
      {!coords && <MapPin size={13} style={{ opacity: 0.7 }} />}
    </a>
  );
}
