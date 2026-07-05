'use client';

import { useEffect, useState } from 'react';
import { Navigation, MapPin } from 'lucide-react';

interface Props {
  deliveryId: string;
  /** Text fallback (e.g. pickup_location/dropoff_location) if nothing is being shared live */
  fallbackAddress: string;
}

// Hands off to the phone's own Maps app for real spoken turn-by-turn
// directions — safer and far more reliable than trying to reimplement
// navigation inside the browser. Prefers the requester's live-shared
// location when available, since street addresses in rural areas are
// often imprecise.
export function NavigateButton({ deliveryId, fallbackAddress }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/api/deliveries/${deliveryId}/location`);
        const json = await res.json();
        if (!cancelled && json.location) setCoords({ lat: json.location.lat, lng: json.location.lng });
      } catch { /* ignore — falls back to address */ }
    }
    check();
    const interval = setInterval(check, 20_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [deliveryId]);

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
      Navigate {coords ? '(live location)' : ''}
      {!coords && <MapPin size={13} style={{ opacity: 0.7 }} />}
    </a>
  );
}
