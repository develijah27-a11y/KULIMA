'use client';

/**
 * Hook for fetching weather logs by farm
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState, useEffect, useCallback } from 'react';
import type { WeatherLog } from '../types/weather.types';
import type { PaginatedResponse } from '@/types/api';

export function useWeatherLogs(
  farmId: string | null,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 20
) {
  const [data, setData] = useState<PaginatedResponse<WeatherLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!farmId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        farmId,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/weather-logs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch weather logs');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [farmId, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs: data?.items || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refetch: fetchLogs,
  };
}
