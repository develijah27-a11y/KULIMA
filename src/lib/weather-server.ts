import { unstable_cache } from 'next/cache';
import { getDistrict, getDefaultDistrict, UGANDA_DISTRICTS } from '@/lib/districts';

export function findClosestDistrict(lat: number, lon: number): string {
  let closest = 'Kampala';
  let minDist = Infinity;
  for (const [name, info] of Object.entries(UGANDA_DISTRICTS)) {
    const dist = Math.hypot(lat - info.lat, lon - info.lng);
    if (dist < minDist) {
      minDist = dist;
      closest = name;
    }
  }
  return closest;
}

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
  rainNotice?: {
    expected: boolean;
    summary: string;
    label: string;
    time: string;
    mm: number;
  };
}

// WMO weather code → OWM icon + description (supports day/night variants)
function wmoToIcon(code: number, isDay = true): { icon: string; description: string } {
  const dOrN = isDay ? 'd' : 'n';
  if (code === 0)                  return { icon: `01${dOrN}`, description: isDay ? 'Clear sky' : 'Clear night' };
  if (code === 1)                  return { icon: `02${dOrN}`, description: isDay ? 'Mainly clear' : 'Mainly clear night' };
  if (code === 2)                  return { icon: `03${dOrN}`, description: 'Partly cloudy' };
  if (code === 3)                  return { icon: `04${dOrN}`, description: 'Overcast' };
  if (code === 45 || code === 48)  return { icon: `50${dOrN}`, description: 'Foggy' };
  if (code >= 51 && code <= 55)    return { icon: `09${dOrN}`, description: 'Drizzle' };
  if (code >= 61 && code <= 65)    return { icon: `10${dOrN}`, description: code <= 62 ? 'Light rain' : code === 63 ? 'Moderate rain' : 'Heavy rain' };
  if (code >= 80 && code <= 82)    return { icon: `09${dOrN}`, description: code === 80 ? 'Light showers' : 'Rain showers' };
  if (code === 95)                 return { icon: `11${dOrN}`, description: 'Thunderstorm' };
  if (code === 96 || code === 99)  return { icon: `11${dOrN}`, description: 'Thunderstorm with hail' };
  return { icon: `02${dOrN}`, description: 'Partly cloudy' };
}

function farmingNote(code: number, precipMm: number, precipProb: number, soilMoisture?: number): string {
  if (code === 95 || code === 96 || code === 99) return 'Avoid field work — thunderstorms expected';
  if (precipMm > 15)  return 'Heavy rain — check drainage, delay spraying';
  if (precipMm > 5)   return 'Good planting rains — ideal for germination';
  if (soilMoisture !== undefined && soilMoisture < 0.15 && precipProb < 30) return 'Topsoil is dry — irrigate before planting if possible';
  if (precipProb > 70) return 'High rain chance — prepare for wet conditions';
  if (code <= 2)       return 'Clear weather — good for spraying and harvesting';
  if (code === 3)      return 'Overcast — good fieldwork conditions';
  return 'Fair conditions for farm activities';
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<ServerWeatherData | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm,is_day');
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,precipitation,weather_code');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,et0_fao_evapotranspiration');
    url.searchParams.set('timezone', 'Africa/Kampala');
    url.searchParams.set('forecast_days', '14');

    const res = await fetch(url.toString(), {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();

    const c = json.current;
    const d = json.daily;
    const h = json.hourly;
    const isDay = c.is_day === 1;
    const { icon: nowIcon, description: nowDesc } = wmoToIcon(c.weather_code, isDay);

    const soilMoistureNow: number | undefined = c.soil_moisture_0_to_1cm;

    const daily: DailyForecast[] = d.time.map((date: string, i: number) => {
      const code = d.weather_code[i];
      const precip = d.precipitation_sum[i] ?? 0;
      const prob   = d.precipitation_probability_max[i] ?? 0;
      const { icon, description } = wmoToIcon(code, true);
      const dt = new Date(date);
      const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }) : undefined;
      return {
        date,
        dayLabel: dt.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' }),
        high: Math.round(d.temperature_2m_max[i]),
        low:  Math.round(d.temperature_2m_min[i]),
        icon,
        description,
        precipMm: Math.round(precip * 10) / 10,
        precipProbability: prob,
        farmingNote: farmingNote(code, precip, prob, i === 0 ? soilMoistureNow : undefined),
        sunrise: fmtTime(d.sunrise?.[i]),
        sunset: fmtTime(d.sunset?.[i]),
        evapotranspiration: d.et0_fao_evapotranspiration?.[i] != null ? Math.round(d.et0_fao_evapotranspiration[i] * 10) / 10 : undefined,
      };
    });

    // Build real hourly forecast items for upcoming 48 hours
    const forecast: WeatherForecastItem[] = [];
    if (h && Array.isArray(h.time)) {
      for (let i = 0; i < h.time.length && forecast.length < 48; i++) {
        const timeStr = h.time[i]; // e.g. "2026-09-12T11:00"
        const dt = new Date(`${timeStr}:00+03:00`);
        const precip = Number(h.precipitation?.[i] ?? 0);
        const pop = Number(h.precipitation_probability?.[i] ?? 0);
        const code = Number(h.weather_code?.[i] ?? 0);
        const temp = Math.round(Number(h.temperature_2m?.[i] ?? c.temperature_2m));
        const hourUg = dt.getHours();
        const isHourDay = hourUg >= 6 && hourUg < 19;
        const { icon: hIcon, description: hDesc } = wmoToIcon(code, isHourDay);

        forecast.push({
          dt_txt: dt.toISOString(),
          main: { temp, temp_min: temp, temp_max: temp },
          weather: [{ icon: hIcon, description: hDesc }],
          rain: precip > 0 ? { '3h': Math.round(precip * 10) / 10 } : undefined,
          pop: Math.round(pop) / 100,
        });
      }
    } else {
      daily.slice(0, 14).forEach((day, i) => {
        forecast.push({
          dt_txt: new Date(Date.now() + i * 86400000).toISOString(),
          main: { temp: Math.round((day.high + day.low) / 2), temp_min: day.low, temp_max: day.high },
          weather: [{ icon: day.icon, description: day.description }],
          rain: day.precipMm > 0 ? { '3h': day.precipMm / 8 } : undefined,
          pop: day.precipProbability / 100,
        });
      });
    }

    // Determine accurate upcoming rain notice for the day
    const todayRainProb = daily[0]?.precipProbability ?? 0;
    const todayPrecipMm = daily[0]?.precipMm ?? 0;
    const nowMs = Date.now() - 15 * 60000;
    const upcomingRain = forecast.find(f => {
      const t = new Date(f.dt_txt).getTime();
      return t >= nowMs && ((f.rain?.['3h'] ?? 0) >= 0.2 || (f.pop ?? 0) >= 0.35);
    });

    let rainNotice = { expected: false, summary: 'No rain expected today', label: 'Clear for fieldwork', time: '', mm: 0 };
    if (todayRainProb >= 40 || todayPrecipMm >= 0.5 || upcomingRain || (c.precipitation && c.precipitation > 0)) {
      const displayProb = Math.max(todayRainProb, upcomingRain ? Math.round((upcomingRain.pop ?? 0) * 100) : 0);
      let timeStr = '';
      if (upcomingRain) {
        const dt = new Date(upcomingRain.dt_txt);
        timeStr = dt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' });
      }

      const isRainingNow = (c.precipitation && c.precipitation > 0) || (c.weather_code >= 51 && c.weather_code <= 99);
      const summaryText = isRainingNow
        ? 'Rain active in the area'
        : timeStr
        ? `Rain expected around ${timeStr}`
        : 'High chance of rain today';

      const mmVal = todayPrecipMm > 0 ? todayPrecipMm : (upcomingRain?.rain?.['3h'] ?? 0);

      rainNotice = {
        expected: true,
        summary: summaryText,
        label: mmVal > 0 ? `~${mmVal.toFixed(1)}mm expected (${displayProb}% chance)` : `${displayProb}% chance of rain`,
        time: timeStr,
        mm: mmVal,
      };
    }

    // Calibrated temperature: daytime tropical heat index / apparent temperature reflects real feels
    const apparentTemp = Math.round(c.apparent_temperature ?? c.temperature_2m);
    const measuredTemp = Math.round(c.temperature_2m);
    const displayTemp = isDay && apparentTemp > measuredTemp
      ? Math.round((apparentTemp * 0.7) + (measuredTemp * 0.3)) // calibrated real-feel daytime temp
      : measuredTemp;

    return {
      now: {
        temp: displayTemp,
        feelsLike: apparentTemp,
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
      rainNotice,
    };
  } catch {
    return null;
  }
}

async function fetchOpenWeatherMap(lat: number, lon: number, apiKey: string): Promise<ServerWeatherData | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`,
      {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(6000),
      }
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
  const rainyMonths = [2, 3, 4, 8, 9, 10]; // March, April, May, September, October, November
  const isRainy = rainyMonths.includes(month);

  const daily: DailyForecast[] = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(Date.now() + i * 86400000);
    const m = dt.getMonth();
    const rain = rainyMonths.includes(m);
    return {
      date: dt.toISOString().split('T')[0],
      dayLabel: dt.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }),
      high: rain ? 26 : 29,
      low: 19,
      icon: rain ? '10d' : '02d',
      description: rain ? 'Rain showers' : 'Partly cloudy',
      precipMm: rain ? 9.2 : 0.5,
      precipProbability: rain ? 85 : 20,
      farmingNote: rain ? 'Good planting rains — ideal for germination' : 'Clear weather — good for spraying and harvesting',
    };
  });

  return {
    now: {
      temp: isRainy ? 24 : 28,
      feelsLike: isRainy ? 26 : 30,
      description: isRainy ? 'Light rain' : 'Partly cloudy',
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

// Cache weather per location for 15 minutes using Next.js data cache.
const fetchWeatherCached = unstable_cache(
  async (lat: number, lon: number): Promise<ServerWeatherData> => {
    // 1. Try Open-Meteo first for hourly precision, day/night awareness, and Uganda calibration
    let data: ServerWeatherData | null = await fetchOpenMeteo(lat, lon);
    // 2. Fallback to OpenWeatherMap if needed
    if (!data) {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey) data = await fetchOpenWeatherMap(lat, lon, apiKey);
    }
    const closest = findClosestDistrict(lat, lon);
    const result = data ?? ugandaFallbackWeather(closest);
    if (!result.district) result.district = closest;
    return result;
  },
  ['weather-location-v5'],
  { revalidate: 600, tags: ['weather'] }
);

export async function fetchWeatherForFarmer(lat: number, lon: number): Promise<ServerWeatherData> {
  const data = await fetchWeatherCached(lat, lon);
  if (!data.district) {
    data.district = findClosestDistrict(lat, lon);
  }
  return data;
}

export async function fetchWeatherForDistrict(districtName: string): Promise<ServerWeatherData> {
  const district = getDistrict(districtName) ?? getDefaultDistrict();
  const data = await fetchWeatherForFarmer(district.lat, district.lng);
  return { ...data, district: district.name };
}
