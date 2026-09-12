'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LMap } from 'leaflet';
import {
  GOOGLE_STREETS_TILE_URL,
  GOOGLE_HYBRID_TILE_URL,
  MAP_TILE_OPTIONS,
  HYBRID_TILE_OPTIONS,
} from '@/lib/map-tiles';

interface Farm {
  id: string;
  name: string;
  size_hectares: number | null;
  boundary: { coordinates: number[][][] } | null;
  district: string | null;
}

interface Props {
  farms: Farm[];
}

export function FarmMapClient({ farms }: Props) {
  const mapRef = useRef<LMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<any>(null);
  const [layerType, setLayerType] = useState<'streets' | 'satellite'>('streets');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    // Async import — does NOT block the main thread
    import('leaflet').then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
        iconUrl: '/leaflet/images/marker-icon.png',
        shadowUrl: '/leaflet/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: false }).setView([1.3733, 32.2903], 7);
      mapRef.current = map;

      const tile = L.tileLayer(GOOGLE_STREETS_TILE_URL, MAP_TILE_OPTIONS).addTo(map);
      tileLayerRef.current = tile;

      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      const bounds: [number, number][] = [];

      farms.forEach((farm) => {
        if (farm.boundary?.coordinates?.[0]) {
          const coords = farm.boundary.coordinates[0] as [number, number][];
          const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));

          const polygon = L.polygon(latLngs, {
            color: 'var(--color-primary)',
            fillColor: 'var(--color-primary-muted)',
            fillOpacity: 0.25,
            weight: 2,
          }).addTo(map);

          polygon.bindPopup(`
            <div style="min-width:140px">
              <p style="font-weight:700;margin:0 0 4px">${farm.name}</p>
              ${farm.size_hectares ? `<p style="margin:0;font-size:12px">${farm.size_hectares} ha</p>` : ''}
              ${farm.district ? `<p style="margin:0;font-size:12px;color:#6B7280">${farm.district}</p>` : ''}
            </div>
          `);

          latLngs.forEach((ll) => bounds.push([ll.lat, ll.lng]));
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchLayer = async (nextType: 'streets' | 'satellite') => {
    if (nextType === layerType || !mapRef.current) return;
    const L = await import('leaflet');
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = nextType === 'satellite'
      ? L.tileLayer(GOOGLE_HYBRID_TILE_URL, HYBRID_TILE_OPTIONS)
      : L.tileLayer(GOOGLE_STREETS_TILE_URL, MAP_TILE_OPTIONS);
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    setLayerType(nextType);
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <link rel="stylesheet" href="/leaflet/leaflet.css" />
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'var(--d-card)',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          overflow: 'hidden',
          border: '1px solid var(--d-border)',
        }}
      >
        <button
          type="button"
          onClick={() => switchLayer('streets')}
          style={{
            padding: '5px 11px',
            fontSize: 11.5,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: layerType === 'streets' ? 'var(--color-primary)' : 'transparent',
            color: layerType === 'streets' ? '#ffffff' : 'var(--d-text)',
          }}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => switchLayer('satellite')}
          style={{
            padding: '5px 11px',
            fontSize: 11.5,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: layerType === 'satellite' ? 'var(--color-primary)' : 'transparent',
            color: layerType === 'satellite' ? '#ffffff' : 'var(--d-text)',
          }}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
