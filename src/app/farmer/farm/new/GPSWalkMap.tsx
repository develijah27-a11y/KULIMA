'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LMap, Polygon, Marker, Polyline } from 'leaflet';
import { Navigation, MapPin, Check, Undo2, Trash2, Maximize2, AlertCircle } from 'lucide-react';
import { MAP_TILE_URL, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

interface Props {
  onBoundaryChange: (coords: [number, number][], areaHa: number) => void;
  initialSizeHa?: number;
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

// Generate an estimated boundary polygon centered on (lat, lng) with specified area (ha)
function generateEstimatedBoundary(center: [number, number], ha: number): [number, number][] {
  const [lat0, lng0] = center;
  const areaM2 = Math.max(ha > 0 ? ha : 1, 0.1) * 10000;
  const sideM = Math.sqrt(areaM2);
  const halfSideM = sideM / 2;

  // Degrees offset
  const dLat = halfSideM / 111111;
  const dLng = halfSideM / (111111 * Math.cos((lat0 * Math.PI) / 180));

  return [
    [Number((lat0 + dLat).toFixed(6)), Number((lng0 - dLng).toFixed(6))], // Top-Left
    [Number((lat0 + dLat).toFixed(6)), Number((lng0 + dLng).toFixed(6))], // Top-Right
    [Number((lat0 - dLat).toFixed(6)), Number((lng0 + dLng).toFixed(6))], // Bottom-Right
    [Number((lat0 - dLat).toFixed(6)), Number((lng0 - dLng).toFixed(6))], // Bottom-Left
  ];
}

export function GPSWalkMap({ onBoundaryChange, initialSizeHa }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const polylineLayerRef = useRef<Polyline | null>(null);
  const polygonLayerRef = useRef<Polygon | null>(null);
  const centerMarkerRef = useRef<Marker | null>(null);
  const pointMarkersRef = useRef<Marker[]>([]);
  const pointsRef = useRef<[number, number][]>([]);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [areaHa, setAreaHa] = useState(0);
  const [locating, setLocating] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState<[number, number] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Clear map drawing layers
  const clearMapLayers = useCallback(() => {
    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }
    pointMarkersRef.current.forEach(m => m.remove());
    pointMarkersRef.current = [];
  }, []);

  // Re-render markers and polygon based on points array
  const renderShapes = useCallback((pts: [number, number][]) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    clearMapLayers();

    // Render draggable numbered circle handles for each boundary corner
    pts.forEach((pt, idx) => {
      const cornerIcon = L.divIcon({
        className: 'farm-corner-drag-handle',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #16A34A;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            transition: transform 0.15s ease;
          " title="Drag to reshape or resize boundary">
            <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; pointer-events: none;">${idx + 1}</span>
          </div>
        `,
      });

      const marker = L.marker(pt, {
        draggable: true,
        icon: cornerIcon,
        zIndexOffset: 1000 + idx,
      }).addTo(map);

      // Realtime live boundary update while dragging
      marker.on('drag', (e: any) => {
        const newPos = e.target.getLatLng();
        pts[idx] = [
          Number(newPos.lat.toFixed(6)),
          Number(newPos.lng.toFixed(6)),
        ];
        pointsRef.current = [...pts];

        if (polygonLayerRef.current) {
          polygonLayerRef.current.setLatLngs(pts);
        } else if (polylineLayerRef.current) {
          polylineLayerRef.current.setLatLngs(pts);
        }

        if (pts.length >= 3) {
          const liveHa = computeAreaHa(pts);
          setAreaHa(liveHa);
          setStatus(`Reshaping corner ${idx + 1} · Live area: ${liveHa.toFixed(2)} ha (${(liveHa * 2.471).toFixed(2)} ac)`);
        }
      });

      // Commit boundary upon releasing drag handle
      marker.on('dragend', () => {
        setPoints([...pts]);
        if (pts.length >= 3) {
          const finalHa = computeAreaHa(pts);
          setAreaHa(finalHa);
          setStatus(`Boundary updated: ${pts.length} corners (${finalHa.toFixed(2)} ha · ${(finalHa * 2.471).toFixed(2)} ac)`);
          onBoundaryChange([...pts], finalHa);
        }
      });

      // Tap corner marker to delete if user has > 3 corners
      marker.on('dblclick', (e: any) => {
        L.DomEvent.stopPropagation(e);
        if (pts.length > 3) {
          const next = pts.filter((_, i) => i !== idx);
          pointsRef.current = next;
          setPoints(next);
          renderShapes(next);
          const ha = computeAreaHa(next);
          setAreaHa(ha);
          setStatus(`Corner ${idx + 1} removed · ${next.length} corners remaining`);
          onBoundaryChange(next, ha);
        }
      });

      pointMarkersRef.current.push(marker);
    });

    if (pts.length >= 3) {
      polygonLayerRef.current = L.polygon(pts, {
        color: '#16A34A',
        fillColor: '#22C55E',
        fillOpacity: 0.32,
        weight: 3,
      }).addTo(map);
    } else if (pts.length === 2) {
      polylineLayerRef.current = L.polyline(pts, {
        color: '#16A34A',
        weight: 3,
        dashArray: '6 4',
      }).addTo(map);
    }
  }, [clearMapLayers, onBoundaryChange]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
        iconUrl: '/leaflet/images/marker-icon.png',
        shadowUrl: '/leaflet/images/marker-shadow.png',
      });

      // Clean satellite map without +/- zoom buttons, without attribution text, and without scroll wheel zoom hijacking
      const map = L.map(containerRef.current!, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
      }).setView([1.3733, 32.2903], 12);
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);

      // Try reading location initially without auto-estimating
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            if (!mounted) return;
            const center: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setDeviceCoords(center);
            map.setView(center, 15);
          },
          () => {}
        );
      }

      // Map click handler: allows thumb/finger tapping corners directly on map to create irregular boundaries
      map.on('click', (e: any) => {
        const newPt: [number, number] = [
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        ];
        const next = [...pointsRef.current, newPt];
        pointsRef.current = next;
        setPoints(next);
        renderShapes(next);

        if (next.length >= 3) {
          const ha = computeAreaHa(next);
          setAreaHa(ha);
          setStatus(`Boundary plotted: ${next.length} corners (${ha.toFixed(2)} ha · ${(ha * 2.471).toFixed(2)} ac)`);
          onBoundaryChange(next, ha);
        } else {
          setAreaHa(0);
          setStatus(`Corner ${next.length} marked — tap at least 3 corners`);
          onBoundaryChange([], 0);
        }
      });

      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      setMapReady(true);
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onBoundaryChange, renderShapes]);

  // Acquire device location and estimate boundary around center
  const acquireDeviceLocation = useCallback((autoEstimate = true) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device browser.');
      return;
    }

    setLocating(true);
    setError('');
    setStatus('Acquiring device GPS location…');

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const centerPt: [number, number] = [lat, lng];
        setDeviceCoords(centerPt);

        const L = leafletRef.current;
        const map = mapRef.current;
        if (map && L) {
          map.setView(centerPt, 16);

          if (centerMarkerRef.current) {
            centerMarkerRef.current.remove();
          }
          centerMarkerRef.current = L.marker(centerPt, {
            title: 'Farm Location (Device GPS)',
          }).addTo(map);
          centerMarkerRef.current.bindPopup('Farm Location (Device GPS)').openPopup();
        }

        if (autoEstimate) {
          const targetHa = initialSizeHa && initialSizeHa > 0 ? initialSizeHa : 1.0;
          const estPts = generateEstimatedBoundary(centerPt, targetHa);
          pointsRef.current = estPts;
          setPoints(estPts);
          renderShapes(estPts);
          const ha = computeAreaHa(estPts);
          setAreaHa(ha);
          onBoundaryChange(estPts, ha);
          setStatus(`Device GPS acquired · Estimated boundary plotted (${ha.toFixed(2)} ha)`);
        } else {
          setStatus('Device GPS location acquired · You can tap corners on the map to outline fields');
        }
      },
      err => {
        setLocating(false);
        setError(`GPS error: ${err.message}. You can still tap corners directly on the map.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [initialSizeHa, onBoundaryChange, renderShapes]);

  // Estimate boundary around existing center or first point
  const estimateFromSize = useCallback(() => {
    const center = deviceCoords || (pointsRef.current.length > 0 ? pointsRef.current[0] : null);
    if (!center) {
      acquireDeviceLocation(true);
      return;
    }
    const targetHa = initialSizeHa && initialSizeHa > 0 ? initialSizeHa : 1.0;
    const estPts = generateEstimatedBoundary(center, targetHa);
    pointsRef.current = estPts;
    setPoints(estPts);
    renderShapes(estPts);
    const ha = computeAreaHa(estPts);
    setAreaHa(ha);
    onBoundaryChange(estPts, ha);
    setStatus(`Estimated boundary updated to ${ha.toFixed(2)} ha centered on GPS location`);

    if (mapRef.current) {
      mapRef.current.fitBounds(estPts, { padding: [30, 30] });
    }
  }, [acquireDeviceLocation, deviceCoords, initialSizeHa, onBoundaryChange, renderShapes]);

  // Undo last corner
  const undoLastCorner = useCallback(() => {
    if (pointsRef.current.length === 0) return;
    const next = pointsRef.current.slice(0, -1);
    pointsRef.current = next;
    setPoints(next);
    renderShapes(next);

    if (next.length >= 3) {
      const ha = computeAreaHa(next);
      setAreaHa(ha);
      setStatus(`Corner removed · ${next.length} corners (${ha.toFixed(2)} ha)`);
      onBoundaryChange(next, ha);
    } else {
      setAreaHa(0);
      setStatus(next.length > 0 ? `${next.length} corner(s) remaining` : '');
      onBoundaryChange([], 0);
    }
  }, [onBoundaryChange, renderShapes]);

  // Clear all
  const clearBoundary = useCallback(() => {
    clearMapLayers();
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
    pointsRef.current = [];
    setPoints([]);
    setAreaHa(0);
    setStatus('');
    setError('');
    onBoundaryChange([], 0);
  }, [clearMapLayers, onBoundaryChange]);

  return (
    <div>
      <link rel="stylesheet" href="/leaflet/leaflet.css" />

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => acquireDeviceLocation(true)}
          disabled={locating || !mapReady}
          style={{
            padding: '9px 14px',
            background: 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12.5,
            cursor: locating || !mapReady ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Navigation size={13} />
          {locating ? 'Acquiring GPS…' : 'Use Device GPS'}
        </button>

        <button
          type="button"
          onClick={estimateFromSize}
          disabled={!mapReady}
          style={{
            padding: '9px 14px',
            background: 'var(--color-surface-2)',
            color: 'var(--d-text)',
            border: '1px solid var(--d-border)',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12.5,
            cursor: mapReady ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Maximize2 size={13} />
          Estimate Boundary
        </button>

        {points.length > 0 && (
          <button
            type="button"
            onClick={undoLastCorner}
            style={{
              padding: '9px 12px',
              background: 'var(--color-surface-2)',
              color: 'var(--d-text)',
              border: '1px solid var(--d-border)',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Undo2 size={12} /> Undo
          </button>
        )}

        {points.length > 0 && (
          <button
            type="button"
            onClick={clearBoundary}
            style={{
              padding: '9px 12px',
              background: 'var(--color-surface-2)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger-border, var(--d-border))',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Trash2 size={12} /> Clear
          </button>
        )}

        {areaHa > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--color-success)',
              background: 'var(--color-success-bg)',
              padding: '4px 10px',
              borderRadius: 6,
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Check size={13} /> {areaHa.toFixed(2)} ha · {(areaHa * 2.471).toFixed(2)} ac
          </span>
        )}
      </div>

      {/* Status or Error feedback */}
      {status && (
        <p style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Check size={12} /> {status}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Map View */}
      <div
        ref={containerRef}
        style={{
          height: 340,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--d-border)',
          position: 'relative',
        }}
      />

      <p style={{ fontSize: 11.5, color: 'var(--d-muted)', marginTop: 8, lineHeight: 1.5 }}>
        <strong>Drag any corner handle (1, 2, 3…)</strong> to resize or reshape irregular farm boundaries to match your exact plot. Tap anywhere on the map to add extra corners, or tap <strong>Use Device GPS</strong> to acquire your location.
      </p>
    </div>
  );
}

// Export alias for clean nomenclature
export const FarmBoundaryMap = GPSWalkMap;
