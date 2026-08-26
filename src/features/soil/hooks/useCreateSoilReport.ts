'use client';

/**
 * Hook for creating soil reports
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState } from 'react';
import type { SoilReport } from '../types/soil.types';
import type { CreateSoilReportInput } from '../validation/soil.schema';

export function useCreateSoilReport() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = async (input: CreateSoilReportInput): Promise<SoilReport> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/soil-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create soil report');
      }

      return json.data.report;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createReport,
    loading,
    error,
  };
}
