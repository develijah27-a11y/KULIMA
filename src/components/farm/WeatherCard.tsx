'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, CloudLightning, Snowflake, Wind,
} from 'lucide-react';

export function getWeatherIcon(code: string, size = 32) {
  switch (code) {
    case '01d':
      return <Sun size={size} className="text-amber-500" />;
    case '01n':
      return <Moon size={size} className="text-indigo-400" />;
    case '02d':
    case '03d':
      return <CloudSun size={size} className="text-amber-400" />;
    case '02n':
    case '03n':
      return <CloudSun size={size} className="text-indigo-300" />;
    case '04d':
    case '04n':
      return <Cloud size={size} className="text-slate-400" />;
    case '09d':
    case '10d':
      return <CloudRain size={size} className="text-sky-500" />;
    case '11d':
      return <CloudLightning size={size} className="text-amber-500" />;
    case '13d':
      return <Snowflake size={size} className="text-sky-300" />;
    case '50d':
      return <Wind size={size} className="text-slate-400" />;
    default:
      return <CloudSun size={size} className="text-amber-400" />;
  }
}

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
  forecast?: { label: string; iconCode?: string; emoji?: string; temp: number }[];
  rainAlert?: string;
  locationName?: string;
}) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      {/* Alert banner */}
      {rainAlert && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-green-500/10 border border-green-400/20 px-3 py-2 text-xs text-green-700 dark:text-green-300">
          <span className="text-base leading-none">{rainAlert}</span>
        </div>
      )}
      {/* Current weather */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10">
          {getWeatherIcon(iconCode, 36)}
        </div>
        <div>
          <p
            className="text-4xl font-extrabold text-[var(--color-text)] font-mono"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {Math.round(currentTemp)}°
          </p>
          <p className="text-xs text-[var(--color-text-muted)] capitalize">{description}</p>
          {locationName && (
            <p className="text-[11px] text-[var(--color-text-hint)] mt-0.5">{locationName}</p>
          )}
        </div>
      </div>
      {/* Forecast strip */}
      {forecast.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="6-day forecast">
          {forecast.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1 min-w-[44px]">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{d.label}</span>
              <div className="py-1">
                {getWeatherIcon(d.iconCode ?? '02d', 18)}
              </div>
              <span className="text-[11px] text-[var(--color-text)] font-mono">{d.temp}°</span>
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
