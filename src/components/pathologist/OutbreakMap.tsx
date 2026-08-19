'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LMap, CircleMarker as LCircleMarker } from 'leaflet';
import { UGANDA_DISTRICTS } from '@/lib/districts';
import { MAP_TILE_URL, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

export interface Hotspot {
  district: string;
  count: number;
  high: number;
  crops: string[];
}

interface Props {
  hotspots: Hotspot[];
}

// Same async-import Leaflet pattern as DeliveryTrackingMap.tsx / FarmMapClient.tsx
// — a 'use client' component that imports leaflet inside useEffect, so it
// never runs during SSR (Leaflet touches `window` at import time and would
// crash the server render otherwise). District coordinates come from the
// same centroid lookup used for delivery tracking — this app has no
// finer-grained geocoding than district level for disease reports either.
export function OutbreakMap({ hotspots }: Props) {
  const mapRef       = useRef<LMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef    = useRef<LCircleMarker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current!, { zoomControl: true, attributionControl: false }).setView([1.3733, 32.2903], 6.4);
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);

      const bounds: [number, number][] = [];

      hotspots.forEach(h => {
        const centroid = UGANDA_DISTRICTS[h.district];
        if (!centroid) return;

        const severity = h.high > 0 ? 'high' : h.count >= 5 ? 'medium' : 'low';
        const color = severity === 'high' ? '#DC2626' : severity === 'medium' ? '#D97706' : '#2D8A57';
        // Radius scales with case count so bigger outbreaks are visually
        // obvious at a glance, capped so one district can't swallow the map.
        const radius = Math.min(10 + h.count * 2.5, 34);

        const marker = L.circleMarker([centroid.lat, centroid.lng], {
          radius, color, fillColor: color, fillOpacity: 0.45, weight: 2,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 160px;">
            <p style="margin: 0 0 4px; font-weight: 800; font-size: 13px;">${h.district}</p>
            <p style="margin: 0 0 2px; font-size: 12px; color: #444;">${h.count} case${h.count !== 1 ? 's' : ''}${h.high > 0 ? ` · ${h.high} urgent` : ''}</p>
            <p style="margin: 0; font-size: 11px; color: #777; text-transform: capitalize;">${h.crops.join(', ')}</p>
          </div>
        `);

        markersRef.current.push(marker);
        bounds.push([centroid.lat, centroid.lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 9 });
      }

      setReady(true);
    });

    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 340 }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#e5e7eb' }} />
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
          <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>Loading map…</p>
        </div>
      )}
    </div>
  );
}
