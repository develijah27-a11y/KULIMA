'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LMap } from 'leaflet';
import { LocateFixed, Check, MapPin } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { UGANDA_DISTRICTS } from '@/lib/districts';
import {
  GOOGLE_STREETS_TILE_URL,
  GOOGLE_HYBRID_TILE_URL,
  MAP_TILE_OPTIONS,
  HYBRID_TILE_OPTIONS,
} from '@/lib/map-tiles';

interface LocationPinPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pos: { lat: number; lng: number }) => void;
  district: string;
  onSkip: () => void;
  title?: string;
}

// Uber/Bolt-style "confirm exact pickup pin" screen: a pin stays fixed in
// the center of the screen and the map pans underneath it (no drag-a-marker
// event handling needed — just read the map's center on 'moveend'). This is
// the fix for GPS/address imprecision, not a hardware fix — the user visibly
// sees where the pin lands and drags the MAP to correct it themselves,
// which is more reliable than trusting either raw device GPS or a fuzzy
// free-text address on its own.
export function LocationPinPicker({
  open,
  onClose,
  district,
  onConfirm,
  onSkip,
  title = 'Pin your pickup spot',
}: LocationPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const tileLayerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [layerType, setLayerType] = useState<'streets' | 'satellite'>('streets');

  const districtInfo = UGANDA_DISTRICTS[district];

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return;
    let mounted = true;
    const start = districtInfo ? { lat: districtInfo.lat, lng: districtInfo.lng } : { lat: 1.3733, lng: 32.2903 };
    setCenter(start);

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current!, { zoomControl: false, attributionControl: false }).setView([start.lat, start.lng], 14);
      mapRef.current = map;

      const tile = L.tileLayer(GOOGLE_STREETS_TILE_URL, MAP_TILE_OPTIONS).addTo(map);
      tileLayerRef.current = tile;

      map.on('moveend', () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
      });

      // Re-measure against the real container size once layout has
      // actually settled — this map opens inside a modal/sheet, exactly
      // the scenario most prone to Leaflet sizing itself off a stale/zero
      // container the instant setView() runs, before the sheet's open
      // transition has actually finished.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      setReady(true);
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      setReady(false);
    };
  }, [open, district]);

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

  function useMyLocation() {
    if (!('geolocation' in navigator)) { setLocateError('Location is not available on this device.'); return; }
    setLocating(true); setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 17);
      },
      () => { setLocating(false); setLocateError('Could not get your location — pan the map to the right spot instead.'); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p style={{ fontSize: 12.5, color: 'var(--d-muted, #6b7566)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Drag the map so the pin sits exactly on the spot — this is what the driver's in-app map and
        navigation will point to, instead of just the district.
      </p>

      <div style={{ position: 'relative', height: 260, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
        <link rel="stylesheet" href="/leaflet/leaflet.css" />
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

        {/* Map / Satellite Layer Switcher */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 600,
          background: 'var(--d-card, #ffffff)', borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)', display: 'flex',
          overflow: 'hidden', border: '1px solid var(--d-border, #e4e8e1)',
        }}>
          <button
            type="button"
            onClick={() => switchLayer('streets')}
            style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: layerType === 'streets' ? 'var(--color-primary)' : 'transparent',
              color: layerType === 'streets' ? '#ffffff' : 'var(--d-text, #182018)',
            }}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => switchLayer('satellite')}
            style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: layerType === 'satellite' ? 'var(--color-primary)' : 'transparent',
              color: layerType === 'satellite' ? '#ffffff' : 'var(--d-text, #182018)',
            }}
          >
            Satellite
          </button>
        </div>

        {/* Fixed center pin — the map moves underneath this, not the other way round */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)',
          zIndex: 500, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <MapPin size={34} style={{ color: 'var(--color-danger, #DC2626)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }} fill="var(--color-danger, #DC2626)" />
        </div>

        <button type="button" onClick={useMyLocation} disabled={locating} style={{
          position: 'absolute', bottom: 10, right: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10, border: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
          fontSize: 12, fontWeight: 700, color: 'var(--d-text, #182018)', cursor: locating ? 'wait' : 'pointer',
        }}>
          <LocateFixed size={13} /> {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      {locateError && <p style={{ fontSize: 11.5, color: 'var(--color-danger)', margin: '0 0 12px' }}>{locateError}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onSkip} style={{
          flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--d-border, #e4e8e1)',
          background: 'transparent', color: 'var(--d-text, #182018)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          Skip — use district only
        </button>
        <button type="button" onClick={() => center && onConfirm(center)} disabled={!ready || !center} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none',
          background: (!ready || !center) ? 'var(--color-surface-2)' : 'var(--color-primary)',
          color: (!ready || !center) ? 'var(--d-muted)' : '#fff', fontWeight: 700, fontSize: 14,
          cursor: (!ready || !center) ? 'not-allowed' : 'pointer',
        }}>
          <Check size={15} /> Confirm pin
        </button>
      </div>
    </BottomSheet>
  );
}
