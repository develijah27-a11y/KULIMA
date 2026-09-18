'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LMap, Marker as LMarker, Polyline as LPolyline } from 'leaflet';
import {
  Volume2, VolumeX, Search, Maximize2, Minimize2, Heart, X, Phone,
  Plus, Minus, Crosshair, Navigation,
} from 'lucide-react';
import { UGANDA_DISTRICTS } from '@/lib/districts';
import { openPhoneDialer, formatPhoneDisplay } from '@/lib/phone-dialer';
import {
  DARK_NAV_TILE_URL,
  DARK_NAV_TILE_OPTIONS,
  GOOGLE_STREETS_TILE_URL,
  GOOGLE_HYBRID_TILE_URL,
  MAP_TILE_OPTIONS,
  HYBRID_TILE_OPTIONS,
} from '@/lib/map-tiles';

// Reliable tile layer with auto-fallback to high-uptime Google road tiles if any network blocks occur
function createReliableTileLayer(L: any, type: 'navigation' | 'satellite' | 'streets') {
  let url = GOOGLE_STREETS_TILE_URL;
  let opts = MAP_TILE_OPTIONS;
  if (type === 'satellite') {
    url = GOOGLE_HYBRID_TILE_URL;
    opts = HYBRID_TILE_OPTIONS;
  } else if (type === 'navigation') {
    url = DARK_NAV_TILE_URL;
    opts = DARK_NAV_TILE_OPTIONS;
  }
  const layer = L.tileLayer(url, opts);
  layer.on('tileerror', function (error: any) {
    if (error?.tile && !error.tile.dataset.fallbackTried) {
      error.tile.dataset.fallbackTried = 'true';
      const c = error.coords;
      if (c) {
        error.tile.src = `https://mt1.google.com/vt/lyrs=m&x=${c.x}&y=${c.y}&z=${c.z}`;
      }
    }
  });
  return layer;
}

interface Props {
  deliveryId: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  otherPartyLabel: string;
  pollMs?: number;
  onPosition?: (pos: { lat: number; lng: number; updatedAt: string } | null) => void;
  onRouteInfo?: (info: { durationSeconds: number | null }) => void;
  driverNotes?: string | null;
  driverPhone?: string | null;
  cargoType?: string | null;
  cargoKg?: number | null;
  deliveryType?: string | null;
  onClose?: () => void;
  onToggleDetails?: () => void;
  fullscreenByDefault?: boolean;
  compact?: boolean;
}

// OpenRouteService geometry proxy
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
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.cos(lat1) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function nearestPathIndex(path: [number, number][], pos: [number, number]): number {
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - pos[0]) ** 2 + (path[i][1] - pos[1]) ** 2;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 3D White Vehicle SVG Icon matching the user's screenshot
function carMarkerHtml(rotationDeg: number): string {
  return `
    <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotationDeg}deg);transition:transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);pointer-events:none;">
      <!-- Forward Headlight Beams (Dark Mode Visibility) -->
      <div style="position:absolute;top:-26px;left:13px;width:30px;height:32px;background:radial-gradient(ellipse at bottom, rgba(255,255,255,0.45) 0%, rgba(0,229,255,0.22) 50%, transparent 80%);clip-path:polygon(20% 100%, 80% 100%, 100% 0%, 0% 0%);pointer-events:none;"></div>

      <!-- Realistic Soft Shadow -->
      <div style="position:absolute;width:28px;height:48px;background:rgba(0,0,0,0.6);border-radius:14px;filter:blur(5px);transform:translateY(3px);"></div>

      <!-- 3D Sleek White Car Body -->
      <svg width="36" height="54" viewBox="0 0 72 108" fill="none" style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
        <!-- Tires / Wheels -->
        <rect x="4" y="18" width="8" height="20" rx="3.5" fill="#0F172A" />
        <rect x="60" y="18" width="8" height="20" rx="3.5" fill="#0F172A" />
        <rect x="4" y="72" width="8" height="20" rx="3.5" fill="#0F172A" />
        <rect x="60" y="72" width="8" height="20" rx="3.5" fill="#0F172A" />

        <!-- Car Chassis Outline -->
        <path d="M14 26 C14 12, 24 6, 36 6 C48 6, 58 12, 58 26 L60 80 C60 92, 54 102, 36 102 C18 102, 12 92, 12 80 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.8" />

        <!-- Mirrors -->
        <path d="M9 34 C9 30, 12 30, 14 32 L14 38 L10 38 Z" fill="#E2E8F0" />
        <path d="M63 34 C63 30, 60 30, 58 32 L58 38 L62 38 Z" fill="#E2E8F0" />

        <!-- Front Hood Creases -->
        <path d="M24 10 L26 26 M48 10 L46 26" stroke="#E2E8F0" stroke-width="1.2" stroke-linecap="round" />

        <!-- Panoramic Tinted Windshield -->
        <path d="M16 30 C24 27, 48 27, 56 30 L52 46 C44 44, 28 44, 20 46 Z" fill="#0F172A" stroke="#334155" stroke-width="1" />
        <path d="M22 32 L40 32 L37 36 L21 36 Z" fill="rgba(255,255,255,0.3)" />

        <!-- Roof Top -->
        <path d="M20 46 L52 46 L50 74 L22 74 Z" fill="#FFFFFF" />
        <line x1="22" y1="60" x2="50" y2="60" stroke="#E2E8F0" stroke-width="1" />

        <!-- Rear Window Glass -->
        <path d="M22 76 C29 75, 43 75, 50 76 L48 86 C41 85, 31 85, 24 86 Z" fill="#0F172A" />

        <!-- Ice Blue Xenon Headlights -->
        <path d="M15 11 C18 8, 25 9, 27 13 L25 17 C22 14, 18 14, 15 15 Z" fill="#38BDF8" filter="drop-shadow(0 0 4px #38BDF8)" />
        <path d="M57 11 C54 8, 47 9, 45 13 L47 17 C50 14, 54 14, 57 15 Z" fill="#38BDF8" filter="drop-shadow(0 0 4px #38BDF8)" />

        <!-- Vivid Red Taillights -->
        <path d="M15 94 C18 97, 25 97, 27 93 L26 90 C23 92, 18 92, 15 91 Z" fill="#EF4444" filter="drop-shadow(0 0 3px #EF4444)" />
        <path d="M57 94 C54 97, 47 97, 45 93 L46 90 C49 92, 54 92, 57 91 Z" fill="#EF4444" filter="drop-shadow(0 0 3px #EF4444)" />
      </svg>
    </div>
  `;
}

export function DeliveryTrackingMap({
  deliveryId,
  pickupDistrict,
  dropoffDistrict,
  pickupCoords,
  dropoffCoords,
  otherPartyLabel,
  pollMs = 3_500,
  onPosition,
  onRouteInfo,
  driverNotes,
  driverPhone,
  cargoType,
  cargoKg,
  onClose,
  onToggleDetails,
  fullscreenByDefault = false,
  compact = false,
}: Props) {
  const mapRef = useRef<LMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveMarkerRef = useRef<LMarker | null>(null);
  const routeLineRef = useRef<LPolyline | null>(null);
  const routeGlowRef = useRef<LPolyline | null>(null);
  const traveledLineRef = useRef<LPolyline | null>(null);
  const routePathRef = useRef<[number, number][] | null>(null);
  const lastPosRef = useRef<[number, number] | null>(null);
  const headingRef = useRef(35);
  const animRef = useRef<number | null>(null);
  const userPannedRef = useRef(false);
  const tileLayerRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const [layerType, setLayerType] = useState<'navigation' | 'satellite' | 'streets'>('streets');
  const [isFullscreen, setIsFullscreen] = useState(fullscreenByDefault);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number>(18);
  const [nextManeuverDistance, setNextManeuverDistance] = useState<string>('17 km to ↰');
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);

  const districtPickup = UGANDA_DISTRICTS[pickupDistrict];
  const districtDropoff = UGANDA_DISTRICTS[dropoffDistrict];
  const pickup = pickupCoords ? { lat: pickupCoords.lat, lng: pickupCoords.lng } : districtPickup;
  const dropoff = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : districtDropoff;

  // Derive realistic highway or corridor name with un-truncated formatting
  const roadTitle = pickupDistrict && dropoffDistrict
    ? (pickupDistrict.toLowerCase() === dropoffDistrict.toLowerCase()
        ? `${pickupDistrict} Route Corridor`
        : `${pickupDistrict} — ${dropoffDistrict} Highway`)
    : 'Main Highway Route';

  // Audio Speech Synthesis for Turn Guidance
  const speakInstruction = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && soundEnabled) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
      } catch {}
    }
  }, [soundEnabled]);

  // Recenter on vehicle marker
  const recenter = useCallback(() => {
    if (!mapRef.current || !lastPosRef.current) return;
    userPannedRef.current = false;
    setShowRecenter(false);
    mapRef.current.panTo(lastPosRef.current, { animate: true, duration: 0.6 });
  }, []);

  // Toggle map layer
  const switchLayer = async (nextType: 'navigation' | 'satellite' | 'streets') => {
    if (nextType === layerType || !mapRef.current) return;
    const L = await import('leaflet');
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = createReliableTileLayer(L, nextType);
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    setLayerType(nextType);
  };

  // Mount Leaflet Map
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

      const center: [number, number] = pickup ? [pickup.lat, pickup.lng] : [0.3476, 32.5825];
      const initialZoom = 13;
      const map = L.map(containerRef.current!, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      }).setView(center, initialZoom);
      mapRef.current = map;

      // Default: Crystal-clear Google road navigation tiles with automatic network fallback
      const tile = createReliableTileLayer(L, 'streets').addTo(map);
      tileLayerRef.current = tile;

      map.on('dragstart', () => {
        userPannedRef.current = true;
        setShowRecenter(true);
      });

      const bounds: [number, number][] = [];

      // Pickup Marker (Glowing Emerald with Label Badge)
      if (pickup) {
        const pickupIcon = L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `
            <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(16,185,129,0.35);animation:cropify-pulse 2s infinite;"></div>
              <div style="width:16px;height:16px;border-radius:50%;background:#10B981;border:3px solid #FFFFFF;box-shadow:0 0 12px #10B981;"></div>
            </div>
          `,
        });
        L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map)
          .bindPopup(`<b>📍 Farm Pickup:</b> ${pickupDistrict}`);
        bounds.push([pickup.lat, pickup.lng]);
      }

      // Dropoff Marker (Neon Coral Red with Label Badge)
      if (dropoff) {
        const dropoffIcon = L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `
            <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,0.35);animation:cropify-pulse 2s infinite;"></div>
              <div style="width:16px;height:16px;border-radius:50%;background:#EF4444;border:3px solid #FFFFFF;box-shadow:0 0 12px #EF4444;"></div>
            </div>
          `,
        });
        L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map)
          .bindPopup(`<b>🏁 Destination:</b> ${dropoffDistrict}`);
        bounds.push([dropoff.lat, dropoff.lng]);
      }

      // Route lines: Neon Cyan Glowing Path
      if (pickup && dropoff) {
        // Fallback straight line while road polyline loads
        routeGlowRef.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
          color: '#00E5FF',
          weight: 10,
          opacity: 0.25,
          lineCap: 'round',
        }).addTo(map);

        routeLineRef.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
          color: '#00F0FF',
          weight: 4,
          opacity: 0.85,
          dashArray: '3 8',
          lineCap: 'round',
        }).addTo(map);

        fetchRoadRoute(pickup, dropoff).then(route => {
          if (!mounted || !mapRef.current || !route) return;
          routePathRef.current = route.path;
          routeGlowRef.current?.remove();
          routeLineRef.current?.remove();

          // Outer glowing aura
          routeGlowRef.current = L.polyline(route.path, {
            color: '#00E5FF',
            weight: 10,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Inner vibrant neon cyan road core
          routeLineRef.current = L.polyline(route.path, {
            color: '#00F0FF',
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          if (route.durationSeconds) {
            const mins = Math.max(1, Math.round(route.durationSeconds / 60));
            setEtaMinutes(mins);
            onRouteInfo?.({ durationSeconds: route.durationSeconds });
          }
        });
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [70, 70] });
      }

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

  // Poll driver position & animate smoothly along road
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/deliveries/${deliveryId}/location`);
        const json = await res.json();
        if (cancelled || !mapRef.current) return;
        const loc = json.location;
        onPosition?.(loc ? { lat: loc.lat, lng: loc.lng, updatedAt: loc.updated_at } : null);
        if (!loc) return;

        const L = await import('leaflet');
        const nextPos: [number, number] = [loc.lat, loc.lng];
        const prevPos = lastPosRef.current;

        if (prevPos && (prevPos[0] !== nextPos[0] || prevPos[1] !== nextPos[1])) {
          const bearing = bearingDeg(prevPos, nextPos);
          headingRef.current = bearing;
          setCompassHeading(Math.round(bearing));
        }

        // Calculate distance remaining
        const target = dropoff || pickup;
        if (target) {
          const distKm = haversineKm(nextPos[0], nextPos[1], target.lat, target.lng);
          setDistanceRemainingKm(Math.max(0.5, distKm));
          const mins = Math.max(1, Math.round((distKm / 38) * 60));
          setEtaMinutes(mins);
          if (distKm < 1) {
            setNextManeuverDistance(`${Math.round(distKm * 1000)} m to destination`);
          } else {
            setNextManeuverDistance(`${distKm.toFixed(1)} km to ↰`);
          }
        }

        // Create or animate 3D car marker
        if (!liveMarkerRef.current) {
          const icon = L.divIcon({
            className: '',
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            html: carMarkerHtml(headingRef.current),
          });
          liveMarkerRef.current = L.marker(nextPos, { icon, zIndexOffset: 1200 }).addTo(mapRef.current).bindPopup(otherPartyLabel);
          lastPosRef.current = nextPos;
        } else if (prevPos) {
          if (animRef.current) cancelAnimationFrame(animRef.current);
          const marker = liveMarkerRef.current;
          const icon = L.divIcon({
            className: '',
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            html: carMarkerHtml(headingRef.current),
          });
          marker.setIcon(icon);

          const start = performance.now();
          const DURATION = 950;
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            const eased = 1 - (1 - t) * (1 - t);
            const lat = prevPos[0] + (nextPos[0] - prevPos[0]) * eased;
            const lng = prevPos[1] + (nextPos[1] - prevPos[1]) * eased;
            marker.setLatLng([lat, lng]);
            if (!userPannedRef.current && mapRef.current) {
              mapRef.current.panTo([lat, lng], { animate: false });
            }
            if (t < 1) {
              animRef.current = requestAnimationFrame(step);
            } else {
              lastPosRef.current = nextPos;
            }
          };
          animRef.current = requestAnimationFrame(step);
        }

        // Split route into Traveled (slate road) & Ahead (glowing cyan)
        const path = routePathRef.current;
        if (path && mapRef.current) {
          const idx = nearestPathIndex(path, nextPos);
          const traveled = path.slice(0, idx + 1);
          if (traveled.length >= 2) {
            if (traveledLineRef.current) {
              traveledLineRef.current.setLatLngs(traveled);
            } else {
              traveledLineRef.current = L.polyline(traveled, {
                color: '#334155',
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(mapRef.current);
            }
          }
        }
      } catch {
        /* Next poll retry */
      }
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ready, deliveryId, otherPartyLabel, pollMs, onPosition, dropoff, pickup]);

  // Compute calculated arrival time
  const arrivalTimeStr = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + etaMinutes);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  const activeDriverNote = driverNotes?.trim() || null;

  const destTarget = dropoff || (dropoffDistrict ? UGANDA_DISTRICTS[dropoffDistrict] : null);
  const googleMapsNavUrl = destTarget
    ? `https://www.google.com/maps/dir/?api=1&destination=${destTarget.lat},${destTarget.lng}&travelmode=driving`
    : (dropoffDistrict ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropoffDistrict + ', Uganda')}` : null);

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 99999 : 1,
        height: isFullscreen ? '100vh' : '100%',
        width: isFullscreen ? '100vw' : '100%',
        borderRadius: isFullscreen ? 0 : 20,
        overflow: 'hidden',
        background: '#070D14',
        boxShadow: isFullscreen ? 'none' : '0 12px 40px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <link rel="stylesheet" href="/leaflet/leaflet.css" />
      <style>{`
        .leaflet-container {
          background: #0A0F1D !important;
        }
        .cropify-pulse { animation: cropify-pulse 2s ease-out infinite; }
        @keyframes cropify-pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .cropify-turn-card {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      {/* Map Container */}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          filter: layerType === 'navigation' ? 'contrast(1.05) saturate(1.1)' : 'none',
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          TOP TURN-BY-TURN HUD MANEUVER CARD (Emerald Dark Banner)
          Matches user image: "Stay on Mbarara - Masaka Rd", "17 km to ↰", Google Mic
         ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          COMPACT MODE OVERLAY: Sleek route preview & expand button
         ───────────────────────────────────────────────────────────── */}
      {compact && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 800,
              background: 'rgba(7, 13, 20, 0.88)',
              backdropFilter: 'blur(10px)',
              borderRadius: 8,
              padding: '5px 11px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 6px #00E5FF' }} />
            <span>{pickupDistrict} → {dropoffDistrict}</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              zIndex: 800,
              background: 'rgba(7, 13, 20, 0.88)',
              backdropFilter: 'blur(10px)',
              borderRadius: 8,
              padding: '5px 11px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: 11.5,
              fontWeight: 800,
              color: '#FBBF24',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            ~{etaMinutes} min · {distanceRemainingKm.toFixed(0)} km
          </div>

          <button
            type="button"
            onClick={() => {
              if (onToggleDetails) onToggleDetails();
              else setIsFullscreen(true);
            }}
            title="Expand Fullscreen GPS"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 800,
              background: 'rgba(7, 13, 20, 0.88)',
              backdropFilter: 'blur(10px)',
              borderRadius: 8,
              padding: '5px 10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            <Maximize2 size={12} /> Expand
          </button>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP TURN-BY-TURN HUD MANEUVER CARD (Emerald Dark Banner)
          Visible only in full GPS tracking mode
         ───────────────────────────────────────────────────────────── */}
      {!compact && (
        <div
          className="cropify-turn-card"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 800,
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.96) 0%, rgba(4, 47, 46, 0.96) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#FFFFFF',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 900,
                color: '#A7F3D0',
                flexShrink: 0,
              }}
            >
              ↰
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.25,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {roadTitle}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FCD34D' }}>
                  {nextManeuverDistance}
                </span>
                <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.85)' }}>
                  · Towards {dropoffDistrict}
                </span>
              </div>
            </div>
          </div>

          {/* Action icons: Voice Guidance / Assistant & Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => speakInstruction(`${roadTitle}. In ${nextManeuverDistance.replace('to ↰', 'turn ahead')}`)}
              title="Spoken Maneuver Guidance"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="#4285F4"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="#34A853"/>
                <path d="M12 14c.77 0 1.48-.3 2-.8l-2-2-2 2c.52.5 1.23.8 2 .8z" fill="#EA4335"/>
                <path d="M12 16.5c1.4 0 2.67-.57 3.58-1.48l-1.42-1.42c-.55.55-1.32.9-2.16.9s-1.61-.35-2.16-.9L8.42 15.02C9.33 15.93 10.6 16.5 12 16.5z" fill="#FBBC05"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen GPS'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          RIGHT FLOATING HUD CONTROLS (Recenter, Zoom, Sound, Layer Toggle)
         ───────────────────────────────────────────────────────────── */}
      {!compact && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            right: 14,
            zIndex: 800,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Recenter on Vehicle */}
          <button
            type="button"
            onClick={recenter}
            title="Center on My Vehicle"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <Crosshair size={20} />
          </button>

          {/* Zoom In & Zoom Out Controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(10px)',
          }}>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom In"
              style={{
                width: 44,
                height: 40,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom Out"
              style={{
                width: 44,
                height: 40,
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} />
            </button>
          </div>

          {/* Layer Mode Toggle (Roads vs Satellite vs Night GPS) */}
          <button
            type="button"
            onClick={() => {
              const next = layerType === 'streets' ? 'satellite' : layerType === 'satellite' ? 'navigation' : 'streets';
              switchLayer(next);
            }}
            title={`Current map: ${layerType === 'streets' ? 'Road Navigation' : layerType === 'satellite' ? 'Satellite View' : 'Night Navigation'}. Tap to switch.`}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {layerType === 'streets' ? '🚗' : layerType === 'satellite' ? '🛰️' : '🌙'}
          </button>

          {/* Audio Mute / Unmute FAB */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) speakInstruction('Voice guidance active');
            }}
            title={soundEnabled ? 'Mute Voice' : 'Unmute Voice'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: soundEnabled ? '#10B981' : '#94A3B8',
            }}
          >
            {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          QUICK SEARCH / WAYPOINT INSPECTOR DRAWER
         ───────────────────────────────────────────────────────────── */}
      {!compact && showQuickSearch && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            right: 68,
            zIndex: 850,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(14px)',
            borderRadius: 16,
            padding: '12px 14px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            width: 240,
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#00E5FF' }}>WAYPOINTS & CARGO</span>
            <button
              type="button"
              onClick={() => setShowQuickSearch(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>📍 <b>From:</b> {pickupDistrict}</div>
            <div>🏁 <b>To:</b> {dropoffDistrict}</div>
            {cargoType && <div>📦 <b>Cargo:</b> {cargoKg ? `${cargoKg}kg · ` : ''}{cargoType}</div>}
            <div>⏱ <b>Speed Avg:</b> ~38 km/h</div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DRIVER LIVE STATUS BUBBLE (Visible only if real driver notes exist)
         ───────────────────────────────────────────────────────────── */}
      {!compact && activeDriverNote && (
        <div
          style={{
            position: 'absolute',
            bottom: 110,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 800,
            maxWidth: '85%',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: '8px 16px',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 6px #00E5FF' }} />
            <span>{activeDriverNote}</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FLOATING "▲ Re-center" BUTTON (Bottom-Left)
         ───────────────────────────────────────────────────────────── */}
      {!compact && ready && showRecenter && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Re-center on vehicle"
          style={{
            position: 'absolute',
            bottom: 90,
            left: 14,
            zIndex: 800,
            height: 38,
            padding: '0 15px',
            borderRadius: 999,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 800,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 10, color: '#00E5FF' }}>▲</span> Re-center
        </button>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM ETA NAVIGATION CARD & ACTION CONTROLS
          Visible in expanded/fullscreen navigation mode
         ───────────────────────────────────────────────────────────── */}
      {!compact && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 800,
            background: 'linear-gradient(180deg, rgba(7, 13, 20, 0.95) 0%, #05090F 100%)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Back Button (Only when in fullscreen or when explicitly closable) */}
          {(isFullscreen || onClose) && (
            <button
              type="button"
              onClick={() => {
                if (isFullscreen) {
                  setIsFullscreen(false);
                } else if (onClose) {
                  onClose();
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              Back
            </button>
          )}

          {/* Central Bold Gold / Amber ETA Display */}
          <div style={{ textAlign: (isFullscreen || onClose) ? 'center' : 'left', flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#FBBF24',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textShadow: '0 0 12px rgba(251, 191, 36, 0.35)',
              }}
            >
              {etaMinutes} min
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.75)',
                marginTop: 2,
              }}
            >
              {distanceRemainingKm.toFixed(0)} km · {arrivalTimeStr}
            </div>
          </div>

          {/* Action Buttons: Direct GPS Navigation & Phone Call */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {googleMapsNavUrl && (
              <a
                href={googleMapsNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.45)',
                  flexShrink: 0,
                }}
                title="Open Turn-by-Turn Driving Directions in Google Maps"
              >
                <Navigation size={14} /> GPS App
              </a>
            )}

            {driverPhone && (
              <button
                type="button"
                onClick={(e) => openPhoneDialer(driverPhone, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.45)',
                  flexShrink: 0,
                }}
                title={`Call ${otherPartyLabel}: ${formatPhoneDisplay(driverPhone)}`}
              >
                <Phone size={14} /> Call
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
