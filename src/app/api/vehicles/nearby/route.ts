import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Freshness window — a vehicle that hasn't reported a position in this long
// is treated as offline even if is_available is still true (driver closed
// the app / lost signal without toggling off), so the map doesn't show
// stale/parked markers as if they were live.
const STALE_AFTER_MINUTES = 5;
const DEFAULT_RADIUS_KM = 25;
const MAX_RESULTS = 40;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/vehicles/nearby?lat=&lng=&radiusKm= — available, recently-active
// vehicles near a point, for the "drivers around you" map shown when
// requesting a delivery. Returns only what's needed to place a marker
// (type, position, distance) — no plate/owner identity, since this is
// shown to any requester before any delivery relationship exists between
// them and the driver.
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const radiusKm = Math.min(parseFloat(url.searchParams.get('radiusKm') ?? '') || DEFAULT_RADIUS_KM, 100);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng query params (numbers) are required' }, { status: 400 });
  }

  // Cheap bounding-box pre-filter in SQL (roughly radiusKm+buffer in each
  // direction) before the exact haversine pass — keeps the row count small
  // regardless of how many vehicles exist platform-wide.
  const degPad = (radiusKm / 111) + 0.2;
  const staleCutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data, error } = await (supabase.from as any)('vehicles')
    .select('id, vehicle_type, current_lat, current_lng, location_updated_at')
    .eq('is_available', true)
    .gte('location_updated_at', staleCutoff)
    .not('current_lat', 'is', null)
    .not('current_lng', 'is', null)
    .gte('current_lat', lat - degPad)
    .lte('current_lat', lat + degPad)
    .gte('current_lng', lng - degPad)
    .lte('current_lng', lng + degPad)
    .limit(500);

  if (error) {
    console.error('[/api/vehicles/nearby GET]', error);
    return NextResponse.json({ error: 'Failed to load nearby drivers.' }, { status: 500 });
  }

  const drivers = ((data ?? []) as any[])
    .map(v => ({
      id: v.id,
      vehicleType: v.vehicle_type,
      lat: v.current_lat,
      lng: v.current_lng,
      updatedAt: v.location_updated_at,
      distanceKm: haversineKm(lat, lng, v.current_lat, v.current_lng),
    }))
    .filter(d => d.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ drivers });
}
