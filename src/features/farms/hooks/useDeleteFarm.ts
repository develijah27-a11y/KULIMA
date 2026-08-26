'use client';

/**
 * Hook for deleting farms
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState } from 'react';

export function useDeleteFarm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteFarm = async (farmId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/farms/${encodeURIComponent(farmId)}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to delete farm');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteFarm,
    loading,
    error,
  };
}
