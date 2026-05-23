'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PriceTag } from '@/components/ui/PriceTag';
import type { MarketPrice } from '@/types/domain';

const weatherEmoji: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '🌤', '02n': '🌤',
  '03d': '⛅', '03n': '⛅',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌦', '10d': '🌧️',
  '11d': '⛈️', '13d': '❄️',
  '50d': '🌫️',
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeatherCard({
  currentTemp,
  description,
  iconCode,
  forecast = [],
  rainAlert,
  locationName,
}: {
  currentTemp: number;
  description: string;
  iconCode: string;
  forecast?: { label: string; emoji: string; temp: number }[];
  rainAlert?: string;
  locationName?: string;
}) {
  const emoji = weatherEmoji[iconCode] ?? '🌤';

  return (
    <Card variant="elevated" className="overflow-hidden">
      {/* Alert banner */}
      {rainAlert && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-400/20 px-3 py-2 text-xs text-blue-300">
          <span className="text-base leading-none">{rainAlert}</span>
        </div>
      )}
      {/* Current weather */}
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none" role="img" aria-label={description}>
          {emoji}
        </span>
        <div>
          <p
            className="text-4xl font-extrabold text-cream font-mono"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {Math.round(currentTemp)}°
          </p>
          <p className="text-xs text-cream/50 capitalize">{description}</p>
          {locationName && (
            <p className="text-[11px] text-cream/30 mt-0.5">{locationName}</p>
          )}
        </div>
      </div>
      {/* Forecast strip */}
      {forecast.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="6-day forecast">
          {forecast.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1 min-w-[44px]">
              <span className="text-[10px] text-cream/40 font-medium">{d.label}</span>
              <span className="text-lg">{d.emoji}</span>
              <span className="text-[11px] text-cream/60 font-mono">{d.temp}°</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function getDayLabel(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return dayLabels[d.getDay()];
}
