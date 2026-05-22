'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];

export function useDiseaseScans(farmId?: string) {
  const supabase = createClient();
  const [scans, setScans] = useState<DiseaseScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      let query = supabase.from('disease_scans').select('*').order('created_at', { ascending: false });
      if (farmId) query = query.eq('farm_id', farmId);
      const { data } = await query;
      if (data) setScans(data);
      setLoading(false);
    };
    fetchScans();
  }, [supabase, farmId]);

  const createScan = async (scan: Omit<DiseaseScan, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('disease_scans').insert(scan).select().single();
    if (data) setScans((prev) => [data, ...prev]);
    return { data, error };
  };

  return { scans, loading, createScan };
}