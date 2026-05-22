'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type WeatherLog = Database['public']['Tables']['weather_logs']['Row'];

export function useWeatherLogs(farmId?: string) {
  const supabase = createClient();
  const [logs, setLogs] = useState<WeatherLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      let query = supabase.from('weather_logs').select('*').order('recorded_at', { ascending: false });
      if (farmId) query = query.eq('farm_id', farmId);
      const { data } = await query;
      if (data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase, farmId]);

  const createLog = async (log: Omit<WeatherLog, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('weather_logs').insert(log).select().single();
    if (data) setLogs((prev) => [data, ...prev]);
    return { data, error };
  };

  return { logs, loading, createLog };
}