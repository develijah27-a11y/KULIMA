import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { WeatherCard, getDayLabel, weatherEmoji } from '@/components/farm/WeatherCard';
import { PriceTicker } from '@/components/farm/PriceTicker';
import { AlertList } from '@/components/farm/AlertItem';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default async function WeatherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

  const weatherApi = process.env.OPENWEATHER_API_KEY
    ? `https://api.openweathermap.org/data/2.5/forecast?lat=${profile?.latitude ?? '0.3476'}&lon=${profile?.longitude ?? '32.5825'}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&cnt=40`
    : null;

  let current: any = null;
  let forecast: any[] = [];
  if (weatherApi) {
    const res = await fetch(weatherApi);
    const json = await res.json();
    if (json.list) {
      forecast = json.list.slice(0, 40);
      current = { main: json.list[0].main, weather: [json.list[0].weather[0]] };
    }
  }

  if (!current) {
    // Demo fallback
    current = { main: { temp: 27, humidity: 65 }, weather: [{ description: 'partly cloudy', icon: '02d' }] };
    forecast = Array.from({ length: 14 }, (_, i) => ({
      dt_txt: new Date(Date.now() + i * 3600 * 1000 * 24).toISOString(),
      main: { temp: 26 + (i % 5), rain: i % 3 === 0 ? { '3h': 12 } : undefined },
      weather: [{ icon: i % 4 === 0 ? '10d' : i < 3 ? '02d' : '01d' }],
    }));
  }

  const currentTemp = Math.round(current?.main?.temp ?? 27);
  const description = current?.weather?.[0]?.description ?? 'partly cloudy';
  const iconCode = current?.weather?.[0]?.icon ?? '02d';
  const humidity = current?.main?.humidity ?? 65;
  const windSpeed = current?.wind?.speed ?? 3.2;
  const rainProb = forecast.some((f: any) => f.pop > 0.6);

  const dayForecast = Array.from({ length: 6 }, (_, i) => {
    const fc = forecast[i * 8] ?? forecast[i];
    const emoji = weatherEmoji[fc?.weather?.[0]?.icon ?? '02d'] ?? '🌤';
    return { label: dayLabels[i + 1], emoji, temp: Math.round(fc?.main?.temp) };
  });

  const twoWeekForecast = Array.from({ length: 14 }, (_, i) => {
    const fc = forecast[i * 8] ?? forecast[i];
    const emoji = weatherEmoji[fc?.weather?.[0]?.icon ?? '02d'] ?? '🌤';
    const rain = fc?.main?.rain?.['3h'] ? Math.min(100, Math.round((fc.main.rain['3h'] / 8) * 100)) : 0;
    const temp = Math.round(fc?.main?.temp);
    return { emoji, rain, temp, date: new Date(Date.now() + i * 86400000).toISOString() };
  });

  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        <Card>
          <p className="text-[11px] text-cream/35 font-semibold tracking-wider uppercase mb-4">Current Weather</p>
          <div className="flex flex-col items-center py-2">
            <span className="text-8xl leading-none" role="img">{weatherEmoji[iconCode] ?? '🌤'}</span>
            <p
              className="text-6xl font-extrabold text-cream mt-3 font-mono"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {currentTemp}°
            </p>
            <p className="text-sm text-cream/50 capitalize">{description}</p>
            {profile?.location && <p className="text-xs text-cream/30 mt-1">{profile.location}</p>}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface2 py-2">
              <p className="text-[11px] text-cream/35">Humidity</p>
              <p className="text-sm font-semibold text-cream">{humidity}%</p>
            </div>
            <div className="rounded-xl bg-surface2 py-2">
              <p className="text-[11px] text-cream/35">Wind</p>
              <p className="text-sm font-semibold text-cream">{windSpeed} m/s</p>
            </div>
            <div className="rounded-xl bg-surface2 py-2">
              <p className="text-[11px] text-cream/35">Rain Chance</p>
              <p className={`text-sm font-semibold ${rainProb ? 'text-blue-400' : 'text-sprout'}`}>
                {rainProb ? 'HIGH' : 'Low'}
              </p>
            </div>
          </div>
        </Card>

        {/* 6 Day forecast */}
        <Card>
          <p className="text-[11px] text-cream/35 font-semibold tracking-wider uppercase mb-3">6-Day Outlook</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dayForecast.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1 min-w-[52px] py-2 rounded-xl bg-surface2">
                <span className="text-[10px] font-semibold text-cream/50">{d.label}</span>
                <span className="text-2xl">{d.emoji}</span>
                <span className="text-xs text-cream/70 font-mono">{d.temp}°</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 14 Day detailed */}
        <Card>
          <p className="text-[11px] text-cream/35 font-semibold tracking-wider uppercase mb-3">14-Day Forecast</p>
          <div className="space-y-1">
            {twoWeekForecast.map((d, i) => {
              const date = new Date(d.date);
              const label = `${dayLabels[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
              const rainBar = d.rain > 50 ? 'bg-blue-400' : 'bg-sprout';
              const highlight = d.rain > 70 ? 'bg-blue-500/10' : '';
              return (
                <div key={i} className={`flex items-center gap-3 py-2 px-2 rounded-lg ${highlight}`}>
                  <span className="text-[11px] font-semibold text-cream/50 w-16">{label}</span>
                  <span className="text-lg">{d.emoji}</span>
                  <div className="flex-1 bg-surface2 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${rainBar}`} style={{ width: `${d.rain}%` }} />
                  </div>
                  <span className="text-[11px] text-cream/50 font-mono w-10 text-right">{d.rain}%</span>
                  <span className="text-xs text-cream/70 w-12 text-right font-mono">{d.temp}°C</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Seasonal outlook */}
        <Card>
          <p className="text-[11px] text-cream/35 font-semibold tracking-wider uppercase mb-3">Seasonal Outlook</p>
          <div className="space-y-2">
            {[
              { season: 'First Rains 2025', onset: 'Mar 15', cessation: 'Jun 20', outlook: 'Above normal rainfall forecast. Good window for maize & beans.' },
              { season: 'Second Rains 2025', onset: 'Sep 20', cessation: 'Dec 15', outlook: 'Normal rainfall expected. Good for sweet potatoes.' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface2 space-y-1">
                <p className="text-sm font-semibold text-cream">{s.season}</p>
                <p className="text-xs text-cream/40">{s.outlook}</p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
