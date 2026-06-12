/**
 * Weather Logging Service
 * Requirements: 7.1, 7.2, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';
import { getFarmById } from '@/features/farms/services/farm.service';

type WeatherLog = Database['public']['Tables']['weather_logs']['Row'];
type WeatherLogInsert = Database['public']['Tables']['weather_logs']['Insert'];

export interface CreateWeatherLogParams {
  farmId: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed?: number;
  conditions?: string;
  recordedAt: string;
}

export async function createWeatherLog(
  params: CreateWeatherLogParams,
  userId: string
): Promise<WeatherLog> {
  await getFarmById(params.farmId, userId);

  const supabase = await createClient();
  const insertData: WeatherLogInsert = {
    farm_id: params.farmId,
    temperature: params.temperature,
    humidity: params.humidity,
    rainfall: params.rainfall,
    wind_speed: params.windSpeed || null,
    conditions: params.conditions || null,
    recorded_at: params.recordedAt,
  };

  const { data, error } = await supabase
    .from('weather_logs')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to create weather log');
  return data;
}

export async function getWeatherLogsByFarm(
  farmId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
  startDate?: string,
  endDate?: string
): Promise<{ weatherLogs: WeatherLog[]; total: number }> {
  await getFarmById(farmId, userId);

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('weather_logs')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId);

  if (startDate) {
    query = query.gte('recorded_at', startDate);
  }
  if (endDate) {
    query = query.lte('recorded_at', endDate);
  }

  const { data, error, count } = await query
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { weatherLogs: data || [], total: count || 0 };
}

export async function getWeatherLogById(
  logId: string,
  userId: string
): Promise<WeatherLog> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('weather_logs')
    .select('*, farms!inner(*)')
    .eq('id', logId)
    .eq('farms.user_id', userId)
    .single();

  if (error || !data) throw new NotFoundError('Weather log not found');
  return data;
}
