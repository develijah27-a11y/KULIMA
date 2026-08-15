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

  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Routing is not configured yet.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const fromLat = parseFloat(searchParams.get('fromLat') ?? '');
  const fromLng = parseFloat(searchParams.get('fromLng') ?? '');
  const toLat   = parseFloat(searchParams.get('toLat') ?? '');
  const toLng   = parseFloat(searchParams.get('toLng') ?? '');
  if ([fromLat, fromLng, toLat, toLng].some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: 'fromLat, fromLng, toLat, toLng are all required numbers' }, { status: 400 });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { headers: { Authorization: apiKey }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return NextResponse.json({ error: 'Could not compute a route.' }, { status: 502 });

    const json = await res.json();
    const feature = json?.features?.[0];
    const coords: [number, number][] | undefined = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return NextResponse.json({ error: 'No route found between those points.' }, { status: 404 });
    }

    // GeoJSON is [lng, lat] — Leaflet wants [lat, lng].
    const path = coords.map(([lng, lat]) => [lat, lng]);
    return NextResponse.json({
      path,
      distanceMeters: feature.properties?.summary?.distance ?? null,
      durationSeconds: feature.properties?.summary?.duration ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Routing request failed. Please try again.' }, { status: 502 });
  }
}
