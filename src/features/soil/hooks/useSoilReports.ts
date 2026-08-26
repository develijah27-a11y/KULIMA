'use client';

/**
 * Hook for fetching soil reports by farm
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState, useEffect, useCallback } from 'react';
import type { SoilReport } from '../types/soil.types';
import type { PaginatedResponse } from '@/types/api';

export function useSoilReports(farmId: string | null, page: number = 1, limit: number = 20) {
  const [data, setData] = useState<PaginatedResponse<SoilReport> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!farmId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/soil-reports?farmId=${encodeURIComponent(farmId)}&page=${page}&limit=${limit}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch soil reports');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [farmId, page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports: data?.items || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refetch: fetchReports,
  };
}
