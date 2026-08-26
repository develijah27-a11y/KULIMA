/**
 * Weather Feature Domain Types
 * Requirements: 8.3, 8.7, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */

import type { Database } from '@/lib/database.types';

export type WeatherLog = Database['public']['Tables']['weather_logs']['Row'];
export type WeatherLogInsert = Database['public']['Tables']['weather_logs']['Insert'];
export type WeatherLogUpdate = Database['public']['Tables']['weather_logs']['Update'];

export interface CreateWeatherLogParams {
  farmId: string;
  temperature: number;
  humidity: number;
  rainfall?: number;
  windSpeed?: number | null;
  conditions?: string | null;
  recordedAt: string;
}

export interface GetWeatherLogsParams {
  farmId: string;
  userId: string;
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  limit?: number;
}
