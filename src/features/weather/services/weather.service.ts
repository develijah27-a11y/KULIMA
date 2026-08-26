/**
 * Weather Logging Service
 * Requirements: 7.1, 7.2, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */

import { createClient } from '@/lib/supabase/server';
import type { WeatherLog, WeatherLogInsert } from '../types/weather.types';
import { getFarmById } from '@/features/farms/services/farm.service';
import { NotFoundError } from '@/utils/error-handler';

export interface CreateWeatherLogParams {
  farmId: string;
  userId: string;
  temperature: number;
  humidity: number;
  rainfall?: number;
  windSpeed?: number | null;
  conditions?: string | null;
  recordedAt: string;
}

/**
 * Creates a new weather log after verifying farm ownership.
 */
export async function createWeatherLog(params: CreateWeatherLogParams): Promise<WeatherLog> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(params.farmId, params.userId);

  const insertData: WeatherLogInsert = {
    farm_id: params.farmId,
    temperature: params.temperature,
    humidity: params.humidity,
    rainfall: params.rainfall ?? 0,
    wind_speed: params.windSpeed ?? null,
    conditions: params.conditions ?? null,
    recorded_at: params.recordedAt,
  };

  const { data, error } = await supabase
    .from('weather_logs')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create weather log');
  }

  return data;
}

/**
 * Retrieves paginated weather logs for a specific farm with optional date filtering.
 */
export async function getWeatherLogsByFarm(
  farmId: string,
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: WeatherLog[]; total: number }> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(farmId, userId);

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

  if (error) {
    throw error;
  }

  return { logs: data || [], total: count || 0 };
}

/**
 * Retrieves a single weather log by ID and validates ownership through the farm.
 */
export async function getWeatherLogById(logId: string, userId: string): Promise<WeatherLog> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('weather_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Weather log not found');
  }

  // Validate farm ownership
  await getFarmById(data.farm_id, userId);

  return data;
}
