'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LMap, Polyline, Polygon } from 'leaflet';
import { MapPin, Check } from 'lucide-react';
import { MAP_TILE_URL, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

interface Props {
  onBoundaryChange: (coords: [number, number][], areaHa: number) => void;
}

function computeAreaHa(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const R = 6371000;
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
  return Math.abs(area / 2) / 10000;
}

export function GPSWalkMap({ onBoundaryChange }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<LMap | null>(null);
  const leafletRef     = useRef<typeof import('leaflet') | null>(null);
  const trackLayerRef  = useRef<Polyline | null>(null);
  const polygonRef     = useRef<Polygon | null>(null);
  const watchIdRef     = useRef<number | null>(null);
  const pointsRef      = useRef<[number, number][]>([]);

  const [walking, setWalking] = useState(false);
  const [points, setPoints]   = useState<[number, number][]>([]);
  const [areaHa, setAreaHa]   = useState(0);
  const [error, setError]     = useState('');
  const [status, setStatus]   = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    // Async import — does NOT block the main thread
    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
        iconUrl: '/leaflet/images/marker-icon.png',
        shadowUrl: '/leaflet/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: false }).setView([1.3733, 32.2903], 13);
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 16);
        }, () => {});
      }

      // Leaflet measures the container's actual pixel size the instant
      // .setView() runs — if that happens before this dynamically-loaded
      // component has been fully laid out (a real risk right after a
      // next/dynamic swap), it initializes against a stale/zero size and
      // renders a blank or half-painted map that never self-corrects
      // without an explicit nudge. invalidateSize() forces Leaflet to
      // re-measure and redraw against the real, final container size.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      setMapReady(true);
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const startWalk = useCallback(() => {
    const L = leafletRef.current;
    if (!L) return;
    if (!navigator.geolocation) { setError('Geolocation not supported on this device'); return; }

    setError('');
    setWalking(true);
    setStatus('Walking boundary... move around the edge of your farm');
    pointsRef.current = [];
    setPoints([]);
    setAreaHa(0);

    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }
    if (polygonRef.current)    { polygonRef.current.remove();    polygonRef.current = null; }

    if (mapRef.current) {
      trackLayerRef.current = L.polyline([], { color: 'var(--color-primary)', weight: 3, dashArray: '6 4' }).addTo(mapRef.current);
    }

    let lastAcceptedAt = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setStatus('Walking boundary... move around the edge of your farm');
        if (accuracy > 30) return;

        // enableHighAccuracy + maximumAge:0 can fire updates faster than
        // once a second on some Android GPS chips — without a time floor,
        // each one triggers a React re-render, a full polyline redraw, and
        // an animated map pan, and those animated pans queue up faster
        // than they can finish, which is what actually read as the map
        // "freezing/lagging" while walking rather than any one operation
        // being slow on its own.
        const now = Date.now();
        if (now - lastAcceptedAt < 1000) return;

        const newPt: [number, number] = [lat, lng];
        const prev = pointsRef.current;

        if (prev.length > 0) {
          const dlat = lat - prev[prev.length - 1][0];
          const dlng = lng - prev[prev.length - 1][1];
          const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
          if (dist < 2) return;
        }

        lastAcceptedAt = now;
        pointsRef.current = [...prev, newPt];
        setPoints([...pointsRef.current]);

        if (mapRef.current) {
          // animate:false — an instant jump reads better than an animated
          // pan that's guaranteed to be interrupted by the next update
          // within a second anyway.
          mapRef.current.panTo([lat, lng], { animate: false });
          trackLayerRef.current?.setLatLngs(pointsRef.current);
        }
      },
      err => {
        // A TIMEOUT (code 3) or momentary POSITION_UNAVAILABLE (code 2) is
        // routine under tree cover, cloud cover, or a cold GPS fix — it
        // does *not* mean the watch died, the browser keeps retrying on
        // its own. Previously any error at all called stopWalk(), which
        // silently discarded every point recorded so far and forced the
        // farmer to restart the whole boundary walk over one dropped fix.
        // Only a real permission denial is unrecoverable.
        if (err.code === err.PERMISSION_DENIED) {
          setError(`GPS error: ${err.message}`);
          stopWalk();
        } else {
          setStatus('Waiting for GPS signal... keep walking, this will resume automatically');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
    );
  }, []);

  const stopWalk = useCallback(() => {
    const L = leafletRef.current;
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

    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }

    if (L && mapRef.current) {
      polygonRef.current = L.polygon(pts, {
        color: 'var(--color-primary)', fillColor: 'var(--color-primary-muted)',
        fillOpacity: 0.3, weight: 2,
      }).addTo(mapRef.current);
      mapRef.current.fitBounds(pts, { padding: [30, 30] });
    }

    const ha = computeAreaHa(pts);
    setAreaHa(ha);
    setStatus(`Boundary captured — ${pts.length} points, ${ha.toFixed(2)} ha`);
    onBoundaryChange(pts, ha);
  }, [onBoundaryChange]);

  const clearBoundary = useCallback(() => {
    if (trackLayerRef.current) { trackLayerRef.current.remove(); trackLayerRef.current = null; }
    if (polygonRef.current)    { polygonRef.current.remove();    polygonRef.current = null; }
    pointsRef.current = [];
    setPoints([]);
    setAreaHa(0);
    setStatus('');
    onBoundaryChange([], 0);
  }, [onBoundaryChange]);

  return (
    <div>
      <link rel="stylesheet" href="/leaflet/leaflet.css" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {!walking ? (
          <button type="button" onClick={startWalk} disabled={!mapReady}
            style={{ padding: '9px 16px', background: mapReady ? 'var(--color-primary)' : 'var(--color-surface-2)', color: mapReady ? '#fff' : 'var(--d-muted)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: mapReady ? 'pointer' : 'not-allowed' }}>
            <MapPin size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />{mapReady ? 'Start GPS Walk' : 'Loading map…'}
          </button>
        ) : (
          <button type="button" onClick={stopWalk}
            style={{ padding: '9px 16px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⏹ Stop Walk ({points.length} pts)
          </button>
        )}

        {points.length > 0 && !walking && (
          <button type="button" onClick={clearBoundary}
            style={{ padding: '9px 14px', background: 'var(--color-surface-2)', color: 'var(--d-muted)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        )}

        {areaHa > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)', marginLeft: 4 }}>
            <Check size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />{areaHa.toFixed(2)} hectares
          </span>
        )}
      </div>

      {status && (
        <p style={{ fontSize: 12, color: walking ? 'var(--color-harvest)' : 'var(--color-success)', fontWeight: 600, marginBottom: 8 }}>
          {walking && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', marginRight: 6, verticalAlign: 'middle' }} />}{status}
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</p>}

      <div ref={containerRef} style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--d-border)' }} />

      <p style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 8 }}>
        Walk around your entire farm perimeter, then tap Stop. Requires GPS — use outdoors for best accuracy.
      </p>
    </div>
  );
}
