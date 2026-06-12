/**
 * Disease Detection Service
 * Requirements: 7.1, 7.2, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';
import { getFarmById } from '@/features/farms/services/farm.service';

type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];
type DiseaseScanInsert = Database['public']['Tables']['disease_scans']['Insert'];

export interface CreateDiseaseScanParams {
  farmId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected?: string;
  confidenceScore?: number;
  treatmentRecommendations?: string;
}

export async function createDiseaseScan(
  params: CreateDiseaseScanParams,
  userId: string
): Promise<DiseaseScan> {
  await getFarmById(params.farmId, userId);

  const supabase = await createClient();
  const insertData: DiseaseScanInsert = {
    farm_id: params.farmId,
    crop_type: params.cropType,
    image_url: params.imageUrl,
    disease_detected: params.diseaseDetected || null,
    confidence_score: params.confidenceScore || null,
    treatment_recommendations: params.treatmentRecommendations || null,
  };

  const { data, error } = await supabase
    .from('disease_scans')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to create disease scan');
  return data;
}

export async function getDiseaseScansByFarm(
  farmId: string,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ diseaseScans: DiseaseScan[]; total: number }> {
  await getFarmById(farmId, userId);

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('disease_scans')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { diseaseScans: data || [], total: count || 0 };
}

export async function getDiseaseScanById(
  scanId: string,
  userId: string
): Promise<DiseaseScan> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disease_scans')
    .select('*, farms!inner(*)')
    .eq('id', scanId)
    .eq('farms.user_id', userId)
    .single();

  if (error || !data) throw new NotFoundError('Disease scan not found');
  return data;
}
