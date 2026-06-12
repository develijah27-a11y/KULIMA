import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0.3476');
  const lon = parseFloat(searchParams.get('lon') ?? '32.5825');

  const supabase = await createClient();
  const locKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // Check cache
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location_key', locKey)
    .gte('cached_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .single();

  if (cached) return NextResponse.json(
    { success: true, data: cached.data },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return NextResponse.json({ success: true, data: devWeather(lat, lon) });

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`
  );
  const json = await res.json();
  const transformed = {
    now: { temp: Math.round(json.list[0].main.temp), description: json.list[0].weather[0].description, icon: json.list[0].weather[0].icon, humidity: json.list[0].main.humidity, wind: json.list[0].wind?.speed ?? 0 },
    forecast: json.list.slice(0, 40),
  };

  await supabase.from('weather_cache').upsert({
    location_key: locKey, data: transformed, cached_at: new Date().toISOString(),
  });

  return NextResponse.json(
    { success: true, data: transformed },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
};

function devWeather(_lat: number, _lon: number) {
  return {
    now: { temp: 28, description: 'partly cloudy', icon: '02d', humidity: 65, wind: 3.2 },
    forecast: Array.from({ length: 6 }, (_, i) => ({
      dt_txt: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      main: { temp: 28 + (i % 3), temp_min: 22, temp_max: 31 },
      weather: [{ icon: i % 3 === 0 ? '10d' : '02d', description: i % 3 === 0 ? 'rain' : 'clouds' }],
      rain: i % 3 === 0 ? { '3h': 12 } : undefined, pop: i % 3 === 0 ? 0.7 : 0.2,
      dt: Date.now() / 1000 + (i + 1) * 86400,
    })),
  };
}
