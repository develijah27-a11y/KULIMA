'use client';

import { WeatherLogCard } from './WeatherLogCard';
import { useWeatherLogs } from '../hooks/useWeatherLogs';

export function WeatherLogList({ farmId }: { farmId?: string }) {
  const { logs, loading } = useWeatherLogs(farmId);

  if (loading) {
    return <div className="text-center py-8">Loading weather logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No weather logs recorded. Add your first weather entry!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <WeatherLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}