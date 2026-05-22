'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type SoilReport = Database['public']['Tables']['soil_reports']['Row'];

export function useSoilReports(farmId?: string) {
  const supabase = createClient();
  const [reports, setReports] = useState<SoilReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      let query = supabase.from('soil_reports').select('*').order('created_at', { ascending: false });
      if (farmId) query = query.eq('farm_id', farmId);
      const { data } = await query;
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, [supabase, farmId]);

  const createReport = async (report: Omit<SoilReport, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('soil_reports').insert(report).select().single();
    if (data) setReports((prev) => [data, ...prev]);
    return { data, error };
  };

  return { reports, loading, createReport };
}