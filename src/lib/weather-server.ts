import { createClient } from '@/lib/supabase/server';

export interface WeatherNow {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
}

export interface WeatherForecastItem {
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ icon: string; description: string }>;
  rain?: { '3h': number };
  pop: number;
}

export interface ServerWeatherData {
  now: WeatherNow;
  forecast: WeatherForecastItem[];
}

export async function fetchWeatherForFarmer(
  lat: number,
  lon: number
): Promise<ServerWeatherData> {
  const supabase = await createClient();
  const locKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location_key', locKey)
    .gte('cached_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .single();

  if (cached?.data) return cached.data as unknown as ServerWeatherData;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return ugandaDevWeather();

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return ugandaDevWeather();
    const json = await res.json();
    const data: ServerWeatherData = {
      now: {
        temp: Math.round(json.list[0].main.temp),
        description: json.list[0].weather[0].description,
        icon: json.list[0].weather[0].icon,
        humidity: json.list[0].main.humidity,
        wind: json.list[0].wind?.speed ?? 0,
      },
      forecast: json.list.slice(0, 40),
    };
    await supabase.from('weather_cache').upsert({
      location_key: locKey,
      data: data as any,
      cached_at: new Date().toISOString(),
    });
    return data;
  } catch {
    return ugandaDevWeather();
  }
}

function ugandaDevWeather(): ServerWeatherData {
  const month = new Date().getMonth();
  const rainyMonths = [2, 3, 4, 9, 10];
  const isRainy = rainyMonths.includes(month);
  return {
    now: {
      temp: isRainy ? 24 : 28,
      description: isRainy ? 'light rain' : 'partly cloudy',
      icon: isRainy ? '10d' : '02d',
      humidity: isRainy ? 82 : 65,
      wind: isRainy ? 4.1 : 2.8,
    },
    forecast: Array.from({ length: 6 }, (_, i) => ({
      dt_txt: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      main: { temp: (isRainy ? 24 : 28) + (i % 2), temp_min: 19, temp_max: 32 },
      weather: [{ icon: i % 3 === 0 ? '10d' : '02d', description: i % 3 === 0 ? 'light rain' : 'partly cloudy' }],
      rain: i % 3 === 0 ? { '3h': 8.4 } : undefined,
      pop: i % 3 === 0 ? 0.65 : 0.2,
      dt: Date.now() / 1000 + (i + 1) * 86400,
    })),
  };
}
