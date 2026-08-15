'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LMap, Marker as LMarker } from 'leaflet';
import { Users, LocateFixed } from 'lucide-react';
import { UGANDA_DISTRICTS } from '@/lib/districts';
import { MAP_TILE_URL, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

interface Driver {
  id: string;
  vehicleType: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: '🏍️', pickup: '🛻', truck: '🚚', lorry: '🚚', minivan: '🚐', tractor: '🚜',
};

interface Props {
  /** Fallback map center when GPS permission isn't granted. */
  userDistrict?: string;
  /** Fixed height for the map container. */
  height?: number | string;
  pollMs?: number;
}

// Bolt/Uber-style "drivers near you" map shown on the delivery request
// flow, before any delivery exists. Centers on the requester's own live GPS
// (falling back to their district centroid if location is denied), and
// polls /api/vehicles/nearby to place a marker per currently-available,
// recently-active vehicle. Distinct from DeliveryTrackingMap, which only
// tracks one already-matched driver on an already-created delivery.
export function NearbyDriversMap({ userDistrict, height = 300, pollMs = 8_000 }: Props) {
  const mapRef        = useRef<LMap | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const selfMarkerRef  = useRef<LMarker | null>(null);
  const driverMarkers  = useRef<Map<string, LMarker>>(new Map());
  const [ready, setReady] = useState(false);
  const [selfPos, setSelfPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [driverCount, setDriverCount] = useState<number | null>(null);

  const fallbackCenter = userDistrict ? UGANDA_DISTRICTS[userDistrict] : undefined;

  // Get + follow the requester's own live position.
  useEffect(() => {
    if (!('geolocation' in navigator)) { setLocationDenied(true); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setSelfPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationDenied(true),
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Init map once we know where to center it (own GPS, or district fallback).
  useEffect(() => {
    const center = selfPos ?? (fallbackCenter ? { lat: fallbackCenter.lat, lng: fallbackCenter.lng } : null);
    if (!containerRef.current || mapRef.current || !center) return;
    let mounted = true;

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: true, attributionControl: false }).setView([center.lat, center.lng], 13);
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);

      setReady(true);
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!selfPos || !!fallbackCenter]);

  // Move/create the self marker whenever live GPS updates.
  useEffect(() => {
    if (!ready || !selfPos || !mapRef.current) return;
    (async () => {
      const L = await import('leaflet');
      if (!selfMarkerRef.current) {
        const icon = L.divIcon({
          className: '', iconSize: [22, 22], iconAnchor: [11, 11],
          html: `<div style="width:18px;height:18px;border-radius:50%;background:#0EA5E9;border:3px solid #fff;box-shadow:0 0 0 4px rgba(14,165,233,.25),0 2px 6px rgba(0,0,0,.3)"></div>`,
        });
        selfMarkerRef.current = L.marker([selfPos.lat, selfPos.lng], { icon, zIndexOffset: 2000 }).addTo(mapRef.current!);
        mapRef.current!.setView([selfPos.lat, selfPos.lng], 14);
      } else {
        selfMarkerRef.current.setLatLng([selfPos.lat, selfPos.lng]);
      }
    })();
  }, [ready, selfPos]);

  // Poll nearby available drivers and sync markers.
  useEffect(() => {
    if (!ready) return;
    const center = selfPos ?? (fallbackCenter ? { lat: fallbackCenter.lat, lng: fallbackCenter.lng } : null);
    if (!center) return;
    let cancelled = false;

    async function poll() {
      try {
        const res  = await fetch(`/api/vehicles/nearby?lat=${center!.lat}&lng=${center!.lng}&radiusKm=25`);
        const json = await res.json();
        if (cancelled || !mapRef.current) return;
        const drivers: Driver[] = json.drivers ?? [];
        setDriverCount(drivers.length);

        const L = await import('leaflet');
        const seen = new Set<string>();
        for (const d of drivers) {
          seen.add(d.id);
          const existing = driverMarkers.current.get(d.id);
          if (existing) {
            existing.setLatLng([d.lat, d.lng]);
          } else {
            const icon = L.divIcon({
              className: '', iconSize: [30, 30], iconAnchor: [15, 15],
              html: `<div style="width:28px;height:28px;border-radius:10px;background:#fff;border:2px solid #166B3A;box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:15px">${VEHICLE_EMOJI[d.vehicleType] ?? '🚗'}</div>`,
            });
            const marker = L.marker([d.lat, d.lng], { icon }).addTo(mapRef.current!)
              .bindPopup(`${d.vehicleType.charAt(0).toUpperCase()}${d.vehicleType.slice(1)} · ~${d.distanceKm.toFixed(1)} km away`);
            driverMarkers.current.set(d.id, marker);
          }
        }
        // Remove markers for drivers no longer in range/available.
        for (const [id, marker] of driverMarkers.current) {
          if (!seen.has(id)) { marker.remove(); driverMarkers.current.delete(id); }
        }
      } catch { /* transient — next poll retries */ }
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ready, selfPos, fallbackCenter, pollMs]);

  if (!selfPos && !fallbackCenter) {
    return (
      <div style={{ height, borderRadius: 14, background: 'var(--d-input-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, textAlign: 'center' }}>
        {locationDenied ? (
          <>
            <LocateFixed size={20} style={{ color: 'var(--d-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0 }}>Enable location access to see drivers near you</p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0 }}>Loading map…</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 500,
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999,
        background: 'var(--d-card)', boxShadow: 'var(--d-shadow-card)', fontSize: 11, fontWeight: 700, color: 'var(--d-text)',
      }}>
        <Users size={12} style={{ color: 'var(--color-primary)' }} />
        {driverCount === null ? 'Finding drivers…' : `${driverCount} driver${driverCount === 1 ? '' : 's'} nearby`}
      </div>

      {locationDenied && !selfPos && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 500,
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 10,
          background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)', fontSize: 10.5, fontWeight: 600,
        }}>
          <LocateFixed size={12} /> Showing your district — enable location access for your exact position
        </div>
      )}
    </div>
  );
}
