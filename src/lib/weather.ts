export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  rainfall: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  description: string;
  rainfall: number;
  icon: string;
}

export async function getWeatherForLocation(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getUgandaClimateModel(month: number): WeatherData {
  // Uganda climate baseline by month (0-indexed)
  const climate: Array<{ temp: number; rainfall: number; desc: string; icon: string }> = [
    { temp: 27, rainfall: 2.1, desc: 'partly cloudy',   icon: '02d' }, // Jan
    { temp: 28, rainfall: 1.8, desc: 'sunny',           icon: '01d' }, // Feb
    { temp: 27, rainfall: 5.2, desc: 'light rain',      icon: '10d' }, // Mar
    { temp: 26, rainfall: 7.8, desc: 'moderate rain',   icon: '10d' }, // Apr
    { temp: 25, rainfall: 6.1, desc: 'light rain',      icon: '10d' }, // May
    { temp: 26, rainfall: 1.9, desc: 'partly cloudy',   icon: '02d' }, // Jun
    { temp: 25, rainfall: 1.2, desc: 'sunny',           icon: '01d' }, // Jul
    { temp: 26, rainfall: 1.5, desc: 'partly cloudy',   icon: '02d' }, // Aug
    { temp: 27, rainfall: 3.4, desc: 'light showers',   icon: '10d' }, // Sep
    { temp: 26, rainfall: 6.8, desc: 'moderate rain',   icon: '10d' }, // Oct
    { temp: 26, rainfall: 7.2, desc: 'heavy rain',      icon: '11d' }, // Nov
    { temp: 27, rainfall: 2.8, desc: 'partly cloudy',   icon: '02d' }, // Dec
  ];

  const c = climate[month] ?? climate[0];
  const forecast: ForecastDay[] = [];
  for (let i = 1; i <= 5; i++) {
    const fm = (month + Math.floor(i / 10)) % 12;
    const fc = climate[fm] ?? c;
    const d = new Date();
    d.setDate(d.getDate() + i);
    forecast.push({
      date: d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric' }),
      high: fc.temp + 1,
      low: fc.temp - 3,
      description: fc.desc,
      rainfall: fc.rainfall * (0.7 + Math.random() * 0.6),
      icon: fc.icon,
    });
  }

  return {
    temp: c.temp,
    feelsLike: c.temp + 2,
    humidity: 70 + Math.round(c.rainfall * 2),
    windSpeed: 2.5 + c.rainfall * 0.3,
    description: c.desc,
    icon: c.icon,
    rainfall: c.rainfall,
    forecast,
  };
}
