/**
 * Disease Detection Service
 * Requirements: 7.1, 7.2, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 */

import { createClient } from '@/lib/supabase/server';
import type { DiseaseScan, DiseaseScanInsert } from '../types/disease.types';
import { getFarmById } from '@/features/farms/services/farm.service';
import { NotFoundError } from '@/utils/error-handler';

export interface CreateDiseaseScanParams {
  farmId: string;
  userId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected?: string | null;
  confidenceScore?: number | null;
  treatmentRecommendations?: string | null;
}

/**
 * Creates a new disease scan after verifying farm ownership.
 */
export async function createDiseaseScan(params: CreateDiseaseScanParams): Promise<DiseaseScan> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(params.farmId, params.userId);

  const insertData: DiseaseScanInsert = {
    farm_id: params.farmId,
    crop_type: params.cropType,
    image_url: params.imageUrl,
    disease_detected: params.diseaseDetected ?? null,
    confidence_score: params.confidenceScore ?? null,
    treatment_recommendations: params.treatmentRecommendations ?? null,
  };

  const { data, error } = await supabase
    .from('disease_scans')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create disease scan');
  }

  return data;
}

/**
 * Retrieves paginated disease scans for a specific farm ordered by created_at DESC.
 */
export async function getDiseaseScansByFarm(
  farmId: string,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ scans: DiseaseScan[]; total: number }> {
  const supabase = await createClient();

  // Validate farm ownership
  await getFarmById(farmId, userId);

  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('disease_scans')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return { scans: data || [], total: count || 0 };
}

/**
 * Retrieves a single disease scan by ID and validates ownership through the farm.
 */
export async function getDiseaseScanById(scanId: string, userId: string): Promise<DiseaseScan> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disease_scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Disease scan not found');
  }

  // Validate farm ownership
  await getFarmById(data.farm_id, userId);

  return data;
}
