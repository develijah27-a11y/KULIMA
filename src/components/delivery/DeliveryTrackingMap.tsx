'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LMap, Marker as LMarker, Polyline as LPolyline } from 'leaflet';
import { UGANDA_DISTRICTS } from '@/lib/districts';

interface Props {
  deliveryId: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  /** Exact pin captured at request time (LocationPinPicker) — preferred
   *  over the district centroid whenever present. */
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  /** Label shown on the live marker's popup — e.g. the driver's name */
  otherPartyLabel: string;
  /** Polling interval for the other party's live position, ms */
  pollMs?: number;
  onPosition?: (pos: { lat: number; lng: number; updatedAt: string } | null) => void;
}

// Live tracking map for a single delivery — pickup/dropoff pins plus a
// moving marker for whichever party is broadcasting via
// /api/deliveries/[id]/location (see ShareLocationButton). Same async-import
// Leaflet pattern as FarmMapClient.tsx — the one other real map in this
// codebase.
//
// Pickup/dropoff pins prefer the exact coordinate captured by
// LocationPinPicker at request time; a district centroid (the only
// geocoding this app had before) is the fallback for older requests that
// were made before pin capture existed, or where the requester skipped it.
export function DeliveryTrackingMap({
  deliveryId, pickupDistrict, dropoffDistrict, pickupCoords, dropoffCoords, otherPartyLabel, pollMs = 8_000, onPosition,
}: Props) {
  const mapRef       = useRef<LMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveMarkerRef = useRef<LMarker | null>(null);
  const routeLineRef  = useRef<LPolyline | null>(null);
  const [ready, setReady] = useState(false);

  const districtPickup  = UGANDA_DISTRICTS[pickupDistrict];
  const districtDropoff = UGANDA_DISTRICTS[dropoffDistrict];
  const pickup  = pickupCoords  ? { lat: pickupCoords.lat,  lng: pickupCoords.lng }  : districtPickup;
  const dropoff = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : districtDropoff;
  const pickupIsExact  = !!pickupCoords;
  const dropoffIsExact = !!dropoffCoords;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const center: [number, number] = pickup ? [pickup.lat, pickup.lng] : [1.3733, 32.2903];
      // Zoom in close when we have a real pin to show; stay wide/district-
      // level when all we have is a centroid, since anything closer would
      // just be zooming into empty space with false precision.
      const initialZoom = pickup && (pickupIsExact || dropoffIsExact) ? 13 : 8;
      const map = L.map(containerRef.current!, { zoomControl: true, attributionControl: false }).setView(center, initialZoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (pickup) {
        const pickupIcon = L.divIcon({
          className: '', iconSize: [16, 16], iconAnchor: [8, 8],
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#166B3A;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        });
        L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map)
          .bindPopup(pickupIsExact ? `Exact pickup spot` : `Pickup — ${pickupDistrict} (approximate)`);
        bounds.push([pickup.lat, pickup.lng]);
      }
      if (dropoff) {
        const dropoffIcon = L.divIcon({
          className: '', iconSize: [16, 16], iconAnchor: [8, 8],
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#DC2626;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        });
        L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map)
          .bindPopup(dropoffIsExact ? `Exact drop-off spot` : `Drop-off — ${dropoffDistrict} (approximate)`);
        bounds.push([dropoff.lat, dropoff.lng]);
      }
      if (pickup && dropoff) {
        routeLineRef.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
          color: '#166B3A', weight: 3, opacity: 0.35, dashArray: '6 8',
        }).addTo(map);
      }
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [48, 48] });

      setReady(true);
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the other party's live position and move/create their marker
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function poll() {
      try {
        const res  = await fetch(`/api/deliveries/${deliveryId}/location`);
        const json = await res.json();
        if (cancelled || !mapRef.current) return;
        const loc = json.location;
        onPosition?.(loc ? { lat: loc.lat, lng: loc.lng, updatedAt: loc.updated_at } : null);
        if (!loc) return;

        const L = await import('leaflet');
        if (!liveMarkerRef.current) {
          const liveIcon = L.divIcon({
            className: '', iconSize: [26, 26], iconAnchor: [13, 13],
            html: `<div style="width:22px;height:22px;border-radius:50%;background:#0EA5E9;border:3px solid #fff;box-shadow:0 2px 8px rgba(14,165,233,.5);display:flex;align-items:center;justify-content:center"></div>`,
          });
          liveMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: liveIcon, zIndexOffset: 1000 })
            .addTo(mapRef.current)
            .bindPopup(otherPartyLabel);
        } else {
          liveMarkerRef.current.setLatLng([loc.lat, loc.lng]);
        }
      } catch { /* transient — next poll will retry */ }
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ready, deliveryId, otherPartyLabel, pollMs, onPosition]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: 14, overflow: 'hidden' }} />
    </>
  );
}
