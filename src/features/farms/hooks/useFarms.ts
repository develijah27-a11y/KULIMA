'use client';

/**
 * Hook for fetching farms list
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState, useEffect, useCallback } from 'react';
import type { Farm } from '../types/farm.types';
import type { PaginatedResponse } from '@/types/api';

export function useFarms(page: number = 1, limit: number = 20, sortBy: 'created_at' | 'name' = 'created_at', order: 'asc' | 'desc' = 'desc') {
  const [data, setData] = useState<PaginatedResponse<Farm> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/farms?page=${page}&limit=${limit}&sortBy=${sortBy}&order=${order}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch farms');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, order]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  return {
    farms: data?.items || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refetch: fetchFarms,
  };
}
