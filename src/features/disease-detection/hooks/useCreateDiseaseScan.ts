'use client';

/**
 * Hook for creating disease scans
 * Requirements: 18.1, 18.2, 18.3, 18.6
 */

import { useState } from 'react';
import type { DiseaseScan } from '../types/disease.types';
import type { CreateDiseaseScanInput } from '../validation/disease.schema';

export function useCreateDiseaseScan() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createScan = async (input: CreateDiseaseScanInput): Promise<DiseaseScan> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/disease-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create disease scan');
      }

      return json.data.scan;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createScan,
    loading,
    error,
  };
}
