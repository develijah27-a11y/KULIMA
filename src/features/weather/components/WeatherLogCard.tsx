'use client';

import type { Database } from '@/lib/database.types';

type WeatherLog = Database['public']['Tables']['weather_logs']['Row'];

interface WeatherLogCardProps {
  log: WeatherLog;
}

export function WeatherLogCard({ log }: WeatherLogCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getTemperatureStyle = () => {
    if (log.temperature >= 30) return { color: 'var(--color-primary-hover)' };
    if (log.temperature >= 20) return { color: 'var(--color-accent)' };
    if (log.temperature >= 10) return { color: 'var(--color-primary)' };
    return { color: 'var(--color-primary-muted)' };
  };

  return (
    <div className="rounded-lg shadow-sm p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {formatDate(log.recorded_at)}
          </p>
          {log.conditions && (
            <span className="px-2 py-1 rounded-full text-xs mt-1 inline-block" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              {log.conditions}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Temperature</p>
          <p className="text-xl font-bold" style={getTemperatureStyle()}>{log.temperature}°C</p>
        </div>

        <div className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Humidity</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{log.humidity}%</p>
        </div>

        <div className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Rainfall</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{log.rainfall}mm</p>
        </div>
      </div>

      {log.wind_speed && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Wind: {log.wind_speed} km/h</p>
      )}
    </div>
  );
}
