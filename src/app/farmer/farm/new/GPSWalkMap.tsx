'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LMap, Polyline, Polygon } from 'leaflet';

interface Props {
  onBoundaryChange: (coords: [number, number][], areaHa: number) => void;
}

function computeAreaHa(points: [number, number][]): number {
  if (points.length < 3) return 0;
  // Shoelace formula with approximate meters conversion
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat0 = toRad(points[0][0]);
  const lng0 = toRad(points[0][1]);

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const x1 = (toRad(points[i][1]) - lng0) * R * Math.cos(lat0);
    const y1 = (toRad(points[i][0]) - lat0) * R;
    const x2 = (toRad(points[j][1]) - lng0) * R * Math.cos(lat0);
    const y2 = (toRad(points[j][0]) - lat0) * R;
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2) / 10000; // m² → hectares
}

export function GPSWalkMap({ onBoundaryChange }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<LMap | null>(null);
  const trackLayerRef  = useRef<Polyline | null>(null);
  const polygonRef     = useRef<Polygon | null>(null);
  const watchIdRef     = useRef<number | null>(null);
  const pointsRef      = useRef<[number, number][]>([]);

  const [walking, setWalking]     = useState(false);
  const [points, setPoints]       = useState<[number, number][]>([]);
  const [areaHa, setAreaHa]       = useState(0);
  const [error, setError]         = useState('');
  const [status, setStatus]       = useState('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current).setView([1.3733, 32.2903], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Try to center on user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      }, () => {});
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const startWalk = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported on this device'); return; }

    setError('');
    setWalking(true);
    setStatus('Walking boundary... move around the edge of your farm');
    pointsRef.current = [];
    setPoints([]);
    setAreaHa(0);

    // Clear previous layers
    const L = require('leaflet');
    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }
    if (polygonRef.current)    { polygonRef.current.remove();    polygonRef.current    = null; }

    if (mapRef.current) {
      trackLayerRef.current = L.polyline([], { color: 'var(--color-primary)', weight: 3, dashArray: '6 4' }).addTo(mapRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (accuracy > 30) return; // skip low-accuracy readings

        const newPt: [number, number] = [lat, lng];
        const prev = pointsRef.current;

        // Skip if too close to last point (< 2m)
        if (prev.length > 0) {
          const dlat = lat - prev[prev.length - 1][0];
          const dlng = lng - prev[prev.length - 1][1];
          const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
          if (dist < 2) return;
        }

        pointsRef.current = [...prev, newPt];
        setPoints([...pointsRef.current]);

        if (mapRef.current) {
          mapRef.current.panTo([lat, lng]);
          trackLayerRef.current?.setLatLngs(pointsRef.current);
        }
      },
      err => {
        setError(`GPS error: ${err.message}`);
        stopWalk();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }, []);

  const stopWalk = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalking(false);

    const pts = pointsRef.current;
    if (pts.length < 3) {
      setStatus('Not enough points — walk at least 3 corners of your farm');
      return;
    }

    const L = require('leaflet');
    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }

    if (mapRef.current) {
      polygonRef.current = L.polygon(pts, { color: 'var(--color-primary)', fillColor: 'var(--color-primary-muted)', fillOpacity: 0.3, weight: 2 }).addTo(mapRef.current);
      mapRef.current.fitBounds(pts, { padding: [30, 30] });
    }

    const ha = computeAreaHa(pts);
    setAreaHa(ha);
    setStatus(`Boundary captured — ${pts.length} points, ${ha.toFixed(2)} ha`);
    onBoundaryChange(pts, ha);
  }, [onBoundaryChange]);

  const clearBoundary = useCallback(() => {
    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }
    if (polygonRef.current)    { polygonRef.current.remove();    polygonRef.current = null;    }
    pointsRef.current = [];
    setPoints([]);
    setAreaHa(0);
    setStatus('');
    onBoundaryChange([], 0);
  }, [onBoundaryChange]);

  return (
    <div>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {!walking ? (
          <button type="button" onClick={startWalk}
            style={{ padding: '9px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📍 Start GPS Walk
          </button>
        ) : (
          <button type="button" onClick={stopWalk}
            style={{ padding: '9px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⏹ Stop Walk ({points.length} pts)
          </button>
        )}

        {points.length > 0 && !walking && (
          <button type="button" onClick={clearBoundary}
            style={{ padding: '9px 14px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        )}

        {areaHa > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginLeft: 4 }}>
            ✓ {areaHa.toFixed(2)} hectares
          </span>
        )}
      </div>

      {status && (
        <p style={{ fontSize: 12, color: walking ? '#D97706' : '#059669', fontWeight: 600, marginBottom: 8 }}>
          {walking && <span style={{ marginRight: 6 }}>🔴</span>}{status}
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{error}</p>}

      <div ref={containerRef} style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }} />

      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
        Walk around your entire farm perimeter, then tap Stop. Requires GPS — use outdoors for best accuracy.
      </p>
    </div>
  );
}
