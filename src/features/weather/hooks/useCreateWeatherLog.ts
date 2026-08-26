'use client';

/**
 * Hook for creating weather logs
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState } from 'react';
import type { WeatherLog } from '../types/weather.types';
import type { CreateWeatherLogInput } from '../validation/weather.schema';

export function useCreateWeatherLog() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createLog = async (input: CreateWeatherLogInput): Promise<WeatherLog> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/weather-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create weather log');
      }

      return json.data.log;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createLog,
    loading,
    error,
  };
}
