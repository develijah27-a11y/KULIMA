'use client';

/**
 * Hook for updating farms
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState } from 'react';
import type { Farm } from '../types/farm.types';
import type { UpdateFarmInput } from '../validation/farm.schema';

export function useUpdateFarm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateFarm = async (farmId: string, input: UpdateFarmInput): Promise<Farm> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/farms/${encodeURIComponent(farmId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update farm');
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
    updateFarm,
    loading,
    error,
  };
}
