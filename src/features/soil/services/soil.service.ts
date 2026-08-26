/**
 * Soil Report Service
 * Requirements: 7.1, 7.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */

import { createClient } from '@/lib/supabase/server';
import type { SoilReport, SoilReportInsert } from '../types/soil.types';
import { getFarmById } from '@/features/farms/services/farm.service';
import { NotFoundError, AuthorizationError } from '@/utils/error-handler';

export interface CreateSoilReportParams {
  farmId: string;
  userId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number | null;
  recommendations?: string | null;
}

/**
 * Creates a new soil report after verifying farm ownership.
 */
export async function createSoilReport(params: CreateSoilReportParams): Promise<SoilReport> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(params.farmId, params.userId);

  const insertData: SoilReportInsert = {
    farm_id: params.farmId,
    ph_level: params.phLevel,
    nitrogen: params.nitrogen,
    phosphorus: params.phosphorus,
    potassium: params.potassium,
    organic_matter: params.organicMatter ?? null,
    recommendations: params.recommendations ?? null,
  };

  const { data, error } = await supabase
    .from('soil_reports')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create soil report');
  }

  return data;
}

/**
 * Retrieves paginated soil reports for a specific farm ordered by created_at DESC.
 */
export async function getSoilReportsByFarm(
  farmId: string,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ reports: SoilReport[]; total: number }> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(farmId, userId);

  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('soil_reports')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return { reports: data || [], total: count || 0 };
}

/**
 * Retrieves a single soil report by ID and validates ownership through the farm.
 */
export async function getSoilReportById(reportId: string, userId: string): Promise<SoilReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('soil_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Soil report not found');
  }

  // Validate farm ownership
  await getFarmById(data.farm_id, userId);

  return data;
}
