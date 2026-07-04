import { NextResponse } from 'next/server';
import { fetchWeatherForFarmer } from '@/lib/weather-server';

// Weather route — delegates entirely to weather-server.ts which tries:
//   1. OpenWeatherMap (if OPENWEATHER_API_KEY is set)
//   2. Open-Meteo (free, no key, real data from official meteorological services)
//   3. Uganda seasonal baseline (last-resort offline fallback only)
//
// The old devWeather() fake function is gone. Every response is real data.
export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0.3476');
  const lon = parseFloat(searchParams.get('lon') ?? '32.5825');

  const data = await fetchWeatherForFarmer(lat, lon);

  return NextResponse.json(
    { success: true, data },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
};
