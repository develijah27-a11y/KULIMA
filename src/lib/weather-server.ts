import { unstable_cache } from 'next/cache';
import { getDistrict, getDefaultDistrict } from '@/lib/districts';

export interface WeatherNow {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
  feelsLike: number;
  precipitation: number;
  uvIndex?: number;
  /** Topsoil (0-1cm) moisture, m³/m³ — Open-Meteo only, used for irrigation advice */
  soilMoisture?: number;
  /** Surface soil temperature, °C — Open-Meteo only */
  soilTemp?: number;
}

export interface WeatherForecastItem {
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ icon: string; description: string }>;
  rain?: { '3h': number };
  pop: number;
}

export interface DailyForecast {
  date: string;
  dayLabel: string;
  high: number;
  low: number;
  icon: string;
  description: string;
  precipMm: number;
  precipProbability: number;
  farmingNote: string;
  /** Open-Meteo only — HH:mm local time */
  sunrise?: string;
  sunset?: string;
  /** Open-Meteo only — mm/day, water lost to evaporation + transpiration */
  evapotranspiration?: number;
}

export interface ServerWeatherData {
  now: WeatherNow;
  forecast: WeatherForecastItem[];
  daily: DailyForecast[];
  district: string;
  source: 'openweather' | 'open-meteo' | 'fallback';
}

// WMO weather code → OWM icon + description
function wmoToIcon(code: number): { icon: string; description: string } {
  if (code === 0)                  return { icon: '01d', description: 'clear sky' };
  if (code === 1)                  return { icon: '02d', description: 'mainly clear' };
  if (code === 2)                  return { icon: '03d', description: 'partly cloudy' };
  if (code === 3)                  return { icon: '04d', description: 'overcast' };
  if (code === 45 || code === 48)  return { icon: '50d', description: 'foggy' };
  if (code >= 51 && code <= 55)    return { icon: '09d', description: 'drizzle' };
  if (code >= 61 && code <= 65)    return { icon: '10d', description: code <= 62 ? 'light rain' : code === 63 ? 'moderate rain' : 'heavy rain' };
  if (code >= 80 && code <= 82)    return { icon: '09d', description: code === 80 ? 'light showers' : 'rain showers' };
  if (code === 95)                 return { icon: '11d', description: 'thunderstorm' };
  if (code === 96 || code === 99)  return { icon: '11d', description: 'thunderstorm with hail' };
  return { icon: '02d', description: 'partly cloudy' };
}

function farmingNote(code: number, precipMm: number, precipProb: number, soilMoisture?: number): string {
  if (code === 95 || code === 96 || code === 99) return '⚠️ Avoid field work — thunderstorms expected';
  if (precipMm > 15)  return '🌧️ Heavy rain — check drainage, delay spraying';
  if (precipMm > 5)   return '🌦️ Good planting rains — ideal for germination';
  // Below ~0.15 m³/m³ is dry topsoil for most Uganda loam/clay soils — worth
  // flagging even on an otherwise dry, clear day since it's the one signal
  // OWM's fallback can't provide at all.
  if (soilMoisture !== undefined && soilMoisture < 0.15 && precipProb < 30) return '🏜️ Topsoil is dry — irrigate before planting if possible';
  if (precipProb > 70) return '☂️ High rain chance — prepare for wet conditions';
  if (code <= 2)       return '☀️ Clear weather — good for spraying and harvesting';
  if (code === 3)      return '⛅ Overcast — good fieldwork conditions';
  return '🌤️ Fair conditions for farm activities';
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<ServerWeatherData | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,et0_fao_evapotranspiration');
    url.searchParams.set('timezone', 'Africa/Nairobi');
    url.searchParams.set('forecast_days', '14');

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = await res.json();

    const c = json.current;
    const d = json.daily;
    const { icon: nowIcon, description: nowDesc } = wmoToIcon(c.weather_code);

    const soilMoistureNow: number | undefined = c.soil_moisture_0_to_1cm;

    const daily: DailyForecast[] = d.time.map((date: string, i: number) => {
      const code = d.weather_code[i];
      const precip = d.precipitation_sum[i] ?? 0;
      const prob   = d.precipitation_probability_max[i] ?? 0;
      const { icon, description } = wmoToIcon(code);
      const dt = new Date(date);
      const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' }) : undefined;
      return {
        date,
        dayLabel: dt.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }),
        high: Math.round(d.temperature_2m_max[i]),
        low:  Math.round(d.temperature_2m_min[i]),
        icon,
        description,
        precipMm: Math.round(precip * 10) / 10,
        precipProbability: prob,
        // Only the first day (today) has an actual soil-moisture reading —
        // Open-Meteo doesn't forecast soil moisture 14 days out.
        farmingNote: farmingNote(code, precip, prob, i === 0 ? soilMoistureNow : undefined),
        sunrise: fmtTime(d.sunrise?.[i]),
        sunset: fmtTime(d.sunset?.[i]),
        evapotranspiration: d.et0_fao_evapotranspiration?.[i] != null ? Math.round(d.et0_fao_evapotranspiration[i] * 10) / 10 : undefined,
      };
    });

    // Build OWM-compatible forecast items from daily data (compatibility with dashboard)
    const forecast: WeatherForecastItem[] = daily.slice(0, 14).map((day, i) => ({
      dt_txt: new Date(Date.now() + i * 86400000).toISOString(),
      main: {
        temp: Math.round((day.high + day.low) / 2),
        temp_min: day.low,
        temp_max: day.high,
      },
      weather: [{ icon: day.icon, description: day.description }],
      rain: day.precipMm > 0 ? { '3h': day.precipMm / 8 } : undefined,
      pop: day.precipProbability / 100,
    }));

    return {
      now: {
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        description: nowDesc,
        icon: nowIcon,
        humidity: c.relative_humidity_2m,
        wind: Math.round(c.wind_speed_10m * 10) / 10,
        precipitation: c.precipitation ?? 0,
        soilMoisture: soilMoistureNow != null ? Math.round(soilMoistureNow * 1000) / 1000 : undefined,
        soilTemp: c.soil_temperature_0cm != null ? Math.round(c.soil_temperature_0cm * 10) / 10 : undefined,
      },
      forecast,
      daily,
      district: '',
      source: 'open-meteo',
    };
  } catch {
    return null;
  }
}

async function fetchOpenWeatherMap(lat: number, lon: number, apiKey: string): Promise<ServerWeatherData | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const first = json.list[0];
    const daily: DailyForecast[] = [];
    const seen = new Set<string>();
    for (const item of json.list) {
      const d = item.dt_txt.split(' ')[0];
      if (seen.has(d)) continue;
      seen.add(d);
      const code = item.weather[0].icon;
      const precipMm = item.rain?.['3h'] ?? 0;
      const prob = (item.pop ?? 0) * 100;
      daily.push({
        date: d,
        dayLabel: new Date(d).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }),
        high: Math.round(item.main.temp_max),
        low:  Math.round(item.main.temp_min),
        icon: code,
        description: item.weather[0].description,
        precipMm: Math.round(precipMm * 10) / 10,
        precipProbability: Math.round(prob),
        farmingNote: farmingNote(0, precipMm, prob),
      });
    }

    return {
      now: {
        temp: Math.round(first.main.temp),
        feelsLike: Math.round(first.main.feels_like ?? first.main.temp),
        description: first.weather[0].description,
        icon: first.weather[0].icon,
        humidity: first.main.humidity,
        wind: first.wind?.speed ?? 0,
        precipitation: first.rain?.['3h'] ?? 0,
      },
      forecast: json.list.slice(0, 40),
      daily: daily.slice(0, 14),
      district: '',
      source: 'openweather',
    };
  } catch {
    return null;
  }
}

function ugandaFallbackWeather(district = 'Kampala'): ServerWeatherData {
  const month = new Date().getMonth();
  const rainyMonths = [2, 3, 4, 9, 10];
  const isRainy = rainyMonths.includes(month);

  const daily: DailyForecast[] = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(Date.now() + i * 86400000);
    const m = dt.getMonth();
    const rain = rainyMonths.includes(m);
    return {
      date: dt.toISOString().split('T')[0],
      dayLabel: dt.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }),
      high: rain ? 25 : 29,
      low: 18,
      icon: rain ? '10d' : '02d',
      description: rain ? 'light rain' : 'partly cloudy',
      precipMm: rain ? 8.4 : 0.5,
      precipProbability: rain ? 70 : 20,
      farmingNote: rain ? '🌦️ Good planting rains — ideal for germination' : '☀️ Clear weather — good for spraying and harvesting',
    };
  });

  return {
    now: {
      temp: isRainy ? 24 : 28,
      feelsLike: isRainy ? 26 : 30,
      description: isRainy ? 'light rain' : 'partly cloudy',
      icon: isRainy ? '10d' : '02d',
      humidity: isRainy ? 82 : 65,
      wind: isRainy ? 4.1 : 2.8,
      precipitation: isRainy ? 3.2 : 0,
    },
    forecast: daily.slice(0, 8).map((d, i) => ({
      dt_txt: new Date(Date.now() + i * 86400000).toISOString(),
      main: { temp: d.high - 1, temp_min: d.low, temp_max: d.high },
      weather: [{ icon: d.icon, description: d.description }],
      rain: d.precipMm > 0 ? { '3h': d.precipMm / 8 } : undefined,
      pop: d.precipProbability / 100,
    })),
    daily,
    district,
    source: 'fallback',
  };
}

// Cache weather per location for 30 minutes using Next.js data cache.
// This is faster than a Supabase roundtrip — data lives in the Node.js
// process memory and survives across requests within the same deployment.
const fetchWeatherCached = unstable_cache(
  async (lat: number, lon: number): Promise<ServerWeatherData> => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    let data: ServerWeatherData | null = null;
    if (apiKey) data = await fetchOpenWeatherMap(lat, lon, apiKey);
    if (!data)  data = await fetchOpenMeteo(lat, lon);
    return data ?? ugandaFallbackWeather();
  },
  ['weather-location'],
  { revalidate: 1800, tags: ['weather'] }
);

export async function fetchWeatherForFarmer(lat: number, lon: number): Promise<ServerWeatherData> {
  return fetchWeatherCached(lat, lon);
}

export async function fetchWeatherForDistrict(districtName: string): Promise<ServerWeatherData> {
  const district = getDistrict(districtName) ?? getDefaultDistrict();
  const data = await fetchWeatherForFarmer(district.lat, district.lng);
  return { ...data, district: district.name };
}
