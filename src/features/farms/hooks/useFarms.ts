'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type Farm = Database['public']['Tables']['farms']['Row'];

export function useFarms() {
  const supabase = createClient();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarms = async () => {
      const { data } = await supabase.from('farms').select('*').order('created_at', { ascending: false });
      if (data) setFarms(data);
      setLoading(false);
    };
    fetchFarms();
  }, [supabase]);

  const createFarm = async (farm: Omit<Farm, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('farms').insert(farm).select().single();
    if (data) setFarms((prev) => [data, ...prev]);
    return { data, error };
  };

  const updateFarm = async (id: string, updates: Partial<Farm>) => {
    const { data, error } = await supabase.from('farms').update(updates).eq('id', id).select().single();
    if (data) setFarms((prev) => prev.map((f) => (f.id === id ? data : f)));
    return { data, error };
  };

  const deleteFarm = async (id: string) => {
    const { error } = await supabase.from('farms').delete().eq('id', id);
    if (!error) setFarms((prev) => prev.filter((f) => f.id !== id));
    return { error };
  };

  return { farms, loading, createFarm, updateFarm, deleteFarm };
}