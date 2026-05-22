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

  const getTemperatureColor = () => {
    if (log.temperature >= 30) return 'text-red-500';
    if (log.temperature >= 20) return 'text-orange-500';
    if (log.temperature >= 10) return 'text-yellow-500';
    return 'text-blue-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-gray-600">
            {formatDate(log.recorded_at)}
          </p>
          {log.conditions && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs mt-1 inline-block">
              {log.conditions}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs text-gray-600">Temperature</p>
          <p className={`text-xl font-bold ${getTemperatureColor()}`}>{log.temperature}°C</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600">Humidity</p>
          <p className="text-xl font-bold">{log.humidity}%</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600">Rainfall</p>
          <p className="text-xl font-bold">{log.rainfall}mm</p>
        </div>
      </div>

      {log.wind_speed && (
        <p className="text-xs text-gray-600 mt-2">Wind: {log.wind_speed} km/h</p>
      )}
    </div>
  );
}