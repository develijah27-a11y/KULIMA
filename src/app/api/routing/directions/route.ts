import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// Thin server-side proxy to OpenRouteService's Directions API — the key
// stays server-only (OPENROUTESERVICE_API_KEY, no NEXT_PUBLIC prefix) and
// every caller must be an authenticated Cropify user, so this can't be
// used as an open, unmetered routing service by anyone who finds the URL.
// Replaces the previous direct-from-browser call to the public OSRM demo
// server (router.project-osrm.org), which is untitled to any Cropify
// account, rate-limited for light/dev use, and had no auth gate at all.
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`routing:${user.id}`, 30, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const mapboxToken =
    process.env.MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const orsKey = process.env.OPENROUTESERVICE_API_KEY;

  const { searchParams } = new URL(req.url);
  const fromLat = parseFloat(searchParams.get('fromLat') ?? '');
  const fromLng = parseFloat(searchParams.get('fromLng') ?? '');
  const toLat   = parseFloat(searchParams.get('toLat') ?? '');
  const toLng   = parseFloat(searchParams.get('toLng') ?? '');
  if ([fromLat, fromLng, toLat, toLng].some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: 'fromLat, fromLng, toLat, toLng are all required numbers' }, { status: 400 });
  }

  // 1. Try Mapbox Directions API first if token is available
  if (mapboxToken) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        const route = json?.routes?.[0];
        const coords: [number, number][] | undefined = route?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          return NextResponse.json({
            path: coords.map(([lng, lat]) => [lat, lng]),
            distanceMeters: route.distance ?? null,
            durationSeconds: route.duration ?? null,
            provider: 'mapbox',
          });
        }
      }
    } catch {
      // Continue to next provider
    }
  }

  // 2. Try OpenRouteService if API key is configured
  if (orsKey) {
    try {
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { headers: { Authorization: orsKey }, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        const feature = json?.features?.[0];
        const coords: [number, number][] | undefined = feature?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          return NextResponse.json({
            path: coords.map(([lng, lat]) => [lat, lng]),
            distanceMeters: feature.properties?.summary?.distance ?? null,
            durationSeconds: feature.properties?.summary?.duration ?? null,
            provider: 'openrouteservice',
          });
        }
      }
    } catch {
      // Continue to next provider
    }
  }

  // 3. Bulletproof fallback: OSRM global routing engine
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      const route = json?.routes?.[0];
      const coords: [number, number][] | undefined = route?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        return NextResponse.json({
          path: coords.map(([lng, lat]) => [lat, lng]),
          distanceMeters: route.distance ?? null,
          durationSeconds: route.duration ?? null,
          provider: 'osrm',
        });
      }
    }
  } catch {
    // Continue to fallback
  }

  // 4. Ultimate resilient fallback: 2-point straight path
  return NextResponse.json({
    path: [[fromLat, fromLng], [toLat, toLng]],
    distanceMeters: null,
    durationSeconds: null,
    provider: 'fallback',
  });
}
