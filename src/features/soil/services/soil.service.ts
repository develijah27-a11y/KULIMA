/**
 * Soil Report Service
 * Requirements: 7.1, 7.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';
import { getFarmById } from '@/features/farms/services/farm.service';

type SoilReport = Database['public']['Tables']['soil_reports']['Row'];
type SoilReportInsert = Database['public']['Tables']['soil_reports']['Insert'];

export interface CreateSoilReportParams {
  farmId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number;
  recommendations?: string;
}

export async function createSoilReport(
  params: CreateSoilReportParams,
  userId: string
): Promise<SoilReport> {
  await getFarmById(params.farmId, userId);

  const supabase = await createClient();
  const insertData: SoilReportInsert = {
    farm_id: params.farmId,
    ph_level: params.phLevel,
    nitrogen: params.nitrogen,
    phosphorus: params.phosphorus,
    potassium: params.potassium,
    organic_matter: params.organicMatter || null,
    recommendations: params.recommendations || null,
  };

  const { data, error } = await supabase
    .from('soil_reports')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to create soil report');
  return data;
}

export async function getSoilReportsByFarm(
  farmId: string,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ soilReports: SoilReport[]; total: number }> {
  await getFarmById(farmId, userId);

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('soil_reports')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { soilReports: data || [], total: count || 0 };
}

export async function getSoilReportById(
  reportId: string,
  userId: string
): Promise<SoilReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('soil_reports')
    .select('*, farms!inner(*)')
    .eq('id', reportId)
    .eq('farms.user_id', userId)
    .single();

  if (error || !data) throw new NotFoundError('Soil report not found');
  return data;
}
