'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LMap, Marker as LMarker, Polyline as LPolyline } from 'leaflet';
import { Locate } from 'lucide-react';
import { UGANDA_DISTRICTS } from '@/lib/districts';
import { MAP_TILE_URL, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

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
  /** Fires once the real road route resolves, with ORS's own duration
   *  estimate — a straight-line/haversine guess until then, if the caller
   *  was already showing one. */
  onRouteInfo?: (info: { durationSeconds: number | null }) => void;
}

// Real road-following geometry via our own /api/routing/directions proxy
// (OpenRouteService, authenticated + rate-limited server-side) — replaces
// the previous direct call to OSRM's public demo server, which had no
// Cropify auth gate and is only meant for light/dev use. Best-effort: any
// failure just keeps whatever line is already drawn (the straight dashed
// fallback), since a route line is a nice-to-have visual, not something
// worth blocking the map on.
async function fetchRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<{ path: [number, number][]; durationSeconds: number | null } | null> {
  try {
    const url = `/api/routing/directions?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json.path) || json.path.length < 2) return null;
    return { path: json.path, durationSeconds: json.durationSeconds ?? null };
  } catch {
    return null;
  }
}

function bearingDeg(from: [number, number], to: [number, number]): number {
  const [lat1, lng1] = from.map(d => (d * Math.PI) / 180);
  const [lat2, lng2] = to.map(d => (d * Math.PI) / 180);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Nearest point on `path` to `pos`, by index — used to split the route into
// a "traveled" (behind the vehicle) and "remaining" (ahead) segment. Path
// lengths here are realistically a few hundred points at most, so a linear
// scan is plenty fast — no need for anything cleverer.
function nearestPathIndex(path: [number, number][], pos: [number, number]): number {
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - pos[0]) ** 2 + (path[i][1] - pos[1]) ** 2;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

const vehicleIconHtml = (rotationDeg: number) => `
  <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
    <div class="cropify-live-pulse" style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(14,165,233,0.35);"></div>
    <div style="position:relative;width:26px;height:26px;border-radius:50%;background:#0EA5E9;border:3px solid #fff;box-shadow:0 2px 10px rgba(14,165,233,.55);display:flex;align-items:center;justify-content:center;transform:rotate(${rotationDeg}deg);transition:transform 0.4s ease-out;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2 L19 21 L12 17 L5 21 Z" fill="#fff"/></svg>
    </div>
  </div>
`;

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
  deliveryId, pickupDistrict, dropoffDistrict, pickupCoords, dropoffCoords, otherPartyLabel, pollMs = 8_000, onPosition, onRouteInfo,
}: Props) {
  const mapRef        = useRef<LMap | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const liveMarkerRef = useRef<LMarker | null>(null);
  const routeLineRef  = useRef<LPolyline | null>(null);
  const traveledLineRef = useRef<LPolyline | null>(null);
  const routePathRef  = useRef<[number, number][] | null>(null);
  const lastPosRef    = useRef<[number, number] | null>(null);
  const headingRef    = useRef(0);
  const animRef       = useRef<number | null>(null);
  const userPannedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);

  const districtPickup  = UGANDA_DISTRICTS[pickupDistrict];
  const districtDropoff = UGANDA_DISTRICTS[dropoffDistrict];
  const pickup  = pickupCoords  ? { lat: pickupCoords.lat,  lng: pickupCoords.lng }  : districtPickup;
  const dropoff = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : districtDropoff;
  const pickupIsExact  = !!pickupCoords;
  const dropoffIsExact = !!dropoffCoords;

  const recenter = useCallback(() => {
    if (!mapRef.current || !lastPosRef.current) return;
    userPannedRef.current = false;
    setShowRecenter(false);
    mapRef.current.panTo(lastPosRef.current, { animate: true, duration: 0.6 });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then(L => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
        iconUrl: '/leaflet/images/marker-icon.png',
        shadowUrl: '/leaflet/images/marker-shadow.png',
      });

      const center: [number, number] = pickup ? [pickup.lat, pickup.lng] : [1.3733, 32.2903];
      // Zoom in close when we have a real pin to show; stay wide/district-
      // level when all we have is a centroid, since anything closer would
      // just be zooming into empty space with false precision.
      const initialZoom = pickup && (pickupIsExact || dropoffIsExact) ? 13 : 8;
      const map = L.map(containerRef.current!, { zoomControl: false, attributionControl: false }).setView(center, initialZoom);
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // A manual pan/drag (not a programmatic panTo from recenter()) means
      // the user wants to look somewhere else — stop auto-following until
      // they explicitly ask to jump back via the recenter FAB. Google
      // Maps' own convention for a live-tracking view.
      map.on('dragstart', () => { userPannedRef.current = true; setShowRecenter(true); });

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
        // Dashed line first (instant), then swapped for the real
        // road-following path once ORS responds — never leave the map with
        // no route line while the fetch is in flight. Rounded caps + brand
        // color throughout, matching the "real road network" feel rather
        // than a raw straight line.
        routeLineRef.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
          color: '#166B3A', weight: 4, opacity: 0.4, dashArray: '2 10', lineCap: 'round',
        }).addTo(map);

        fetchRoadRoute(pickup, dropoff).then(route => {
          if (!mounted || !mapRef.current || !route) return;
          routePathRef.current = route.path;
          routeLineRef.current?.remove();
          // Remaining segment: dashed, lighter — ahead of the vehicle.
          routeLineRef.current = L.polyline(route.path, {
            color: '#166B3A', weight: 5, opacity: 0.35, dashArray: '2 10', lineCap: 'round', lineJoin: 'round',
          }).addTo(map);
          onRouteInfo?.({ durationSeconds: route.durationSeconds });
        });
      }
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [56, 56] });

      // Re-measure against the real container size once layout has
      // actually settled — Leaflet sizes itself off the container at the
      // instant setView()/fitBounds() runs, which can be a stale/zero size
      // right after mount and never self-corrects without this nudge.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      setReady(true);
    });

    return () => {
      mounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the other party's live position and smoothly animate their marker
  // to it, instead of snapping — a teleporting dot is the #1 tell of an
  // unpolished tracking map. Also re-draws the traveled/remaining route
  // split each time, and keeps the camera on the vehicle unless the user
  // has manually panned away.
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
        const nextPos: [number, number] = [loc.lat, loc.lng];
        const prevPos = lastPosRef.current;

        if (prevPos && (prevPos[0] !== nextPos[0] || prevPos[1] !== nextPos[1])) {
          headingRef.current = bearingDeg(prevPos, nextPos);
        }

        if (!liveMarkerRef.current) {
          const icon = L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html: vehicleIconHtml(headingRef.current) });
          liveMarkerRef.current = L.marker(nextPos, { icon, zIndexOffset: 1000 }).addTo(mapRef.current).bindPopup(otherPartyLabel);
          lastPosRef.current = nextPos;
        } else if (prevPos) {
          // Interpolate over ~1s rather than snapping straight to the new
          // point — smooth movement is what reads as "really moving" as
          // opposed to a static image with a dot on it.
          if (animRef.current) cancelAnimationFrame(animRef.current);
          const marker = liveMarkerRef.current;
          const icon = L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html: vehicleIconHtml(headingRef.current) });
          marker.setIcon(icon);

          const start = performance.now();
          const DURATION = 900;
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            const eased = 1 - (1 - t) * (1 - t); // ease-out
            const lat = prevPos[0] + (nextPos[0] - prevPos[0]) * eased;
            const lng = prevPos[1] + (nextPos[1] - prevPos[1]) * eased;
            marker.setLatLng([lat, lng]);
            if (!userPannedRef.current && mapRef.current) mapRef.current.panTo([lat, lng], { animate: false });
            if (t < 1) { animRef.current = requestAnimationFrame(step); }
            else { lastPosRef.current = nextPos; }
          };
          animRef.current = requestAnimationFrame(step);
        }

        // Split the route at the vehicle's nearest point: solid/opaque
        // behind it (traveled), dashed/lighter ahead (remaining) — set up
        // when the road route first resolves, above.
        const path = routePathRef.current;
        if (path && mapRef.current) {
          const idx = nearestPathIndex(path, nextPos);
          const traveled = path.slice(0, idx + 1);
          if (traveled.length >= 2) {
            if (traveledLineRef.current) traveledLineRef.current.setLatLngs(traveled);
            else traveledLineRef.current = L.polyline(traveled, { color: '#166B3A', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(mapRef.current);
          }
        }
      } catch { /* transient — next poll will retry */ }
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ready, deliveryId, otherPartyLabel, pollMs, onPosition]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <link rel="stylesheet" href="/leaflet/leaflet.css" />
      <style>{`
        .cropify-live-pulse { animation: cropify-pulse 1.8s ease-out infinite; }
        @keyframes cropify-pulse {
          0%   { transform: scale(0.6); opacity: 0.55; }
          70%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,0.18) !important; border-radius: 10px !important; overflow: hidden; }
        .leaflet-control-zoom a { width: 34px !important; height: 34px !important; line-height: 34px !important; background: #fff !important; color: #123825 !important; font-weight: 700 !important; }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }
      `}</style>

      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Skeleton/shimmer loading state — a broken map and a loading map
          previously looked identical (both a flat gray box), which is part
          of why a real rendering bug went unnoticed for a while. */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #eef1ee 25%, #e4e8e4 37%, #eef1ee 63%)',
          backgroundSize: '400% 100%', animation: 'cropify-shimmer 1.4s ease infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <style>{`@keyframes cropify-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
          <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Loading map…</p>
        </div>
      )}

      {/* Recenter FAB — only once the user has manually panned away from
          the tracked vehicle, Google Maps' own convention rather than
          fighting their pan with a forced re-center every poll. */}
      {ready && showRecenter && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Recenter on driver"
          style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 500,
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Locate size={18} style={{ color: '#0EA5E9' }} />
        </button>
      )}
    </div>
  );
}
