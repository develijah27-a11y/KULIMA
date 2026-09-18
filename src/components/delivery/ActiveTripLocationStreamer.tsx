'use client';

import { useEffect, useRef, useState } from 'react';
import { Radio, AlertCircle, ShieldCheck } from 'lucide-react';

interface Props {
  deliveryId: string;
  status: string; // 'assigned' | 'in_transit' | 'delivered' | etc.
  tripPhase?: string;
  onPositionUpdate?: (coords: { lat: number; lng: number; accuracy: number; heading?: number | null; speed?: number | null }) => void;
}

export function ActiveTripLocationStreamer({ deliveryId, status, tripPhase, onPositionUpdate }: Props) {
  const [gpsStatus, setGpsStatus] = useState<'streaming' | 'acquiring' | 'denied' | 'idle'>('acquiring');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef<number>(0);
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLockRef = useRef<any>(null);

  const isActive = status === 'assigned' || status === 'in_transit';

  useEffect(() => {
    if (!isActive) {
      setGpsStatus('idle');
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      return;
    }

    // Request screen wake lock so the phone doesn't sleep while driving/navigating
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    setGpsStatus('acquiring');

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc, heading, speed } = pos.coords;
        setGpsStatus('streaming');
        setAccuracy(Math.round(acc));

        onPositionUpdate?.({ lat, lng, accuracy: acc, heading, speed });

        const now = Date.now();
        // Throttle updates: send at most once every 3.5 seconds, or if moved significantly
        const hasMoved = !lastCoords.current ||
          Math.abs(lastCoords.current.lat - lat) > 0.00004 ||
          Math.abs(lastCoords.current.lng - lng) > 0.00004;

        if (now - lastSentAt.current >= 3500 && hasMoved) {
          lastSentAt.current = now;
          lastCoords.current = { lat, lng };

          fetch(`/api/deliveries/${deliveryId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn('[ActiveTripLocationStreamer] Geolocation error:', err);
        setGpsStatus('denied');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [deliveryId, isActive]);

  if (!isActive || gpsStatus === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 12,
        background: gpsStatus === 'denied' ? 'var(--color-danger-bg, #FEF2F2)' : 'var(--color-surface-2, #EAF6EE)',
        border: `1px solid ${gpsStatus === 'denied' ? 'var(--color-danger, #EF4444)' : 'rgba(22, 107, 58, 0.25)'}`,
        color: gpsStatus === 'denied' ? 'var(--color-danger, #DC2626)' : 'var(--color-primary, #166B3A)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {gpsStatus === 'streaming' && (
          <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
            <span className="animate-ping" style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#10B981', opacity: 0.75 }} />
            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: 8, width: 8, backgroundColor: '#059669' }} />
          </span>
        )}
        {gpsStatus === 'acquiring' && (
          <Radio size={14} className="animate-spin text-amber-500" />
        )}
        {gpsStatus === 'denied' && (
          <AlertCircle size={14} className="text-red-500 shrink-0" />
        )}

        <span>
          {gpsStatus === 'streaming' && 'Live GPS Broadcasting to Requester'}
          {gpsStatus === 'acquiring' && 'Acquiring high-accuracy satellite fix…'}
          {gpsStatus === 'denied' && 'GPS Disabled · Enable location to share trip progress'}
        </span>
      </div>

      {gpsStatus === 'streaming' && accuracy !== null && (
        <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={12} />
          ±{accuracy}m accuracy
        </span>
      )}
    </div>
  );
}
