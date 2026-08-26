'use client';

/**
 * Hook for creating farms
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState } from 'react';
import type { Farm } from '../types/farm.types';
import type { CreateFarmInput } from '../validation/farm.schema';

export function useCreateFarm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createFarm = async (input: CreateFarmInput): Promise<Farm> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create farm');
      }

      return json.data.farm;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createFarm,
    loading,
    error,
  };
}
