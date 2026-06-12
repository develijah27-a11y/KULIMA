/**
 * Farm Management Service
 * Requirements: 7.1, 7.2, 14.1, 14.2, 14.3, 14.4, 14.5, 14.7
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { NotFoundError, AuthorizationError } from '@/utils/error-handler';

type Farm = Database['public']['Tables']['farms']['Row'];
type FarmInsert = Database['public']['Tables']['farms']['Insert'];
type FarmUpdate = Database['public']['Tables']['farms']['Update'];

export interface CreateFarmParams {
  userId: string;
  name: string;
  location: string;
  sizeHectares?: number;
  farmType?: string;
}

export interface UpdateFarmParams {
  name?: string;
  location?: string;
  sizeHectares?: number;
  farmType?: string;
}

export async function createFarm(params: CreateFarmParams): Promise<Farm> {
  const supabase = await createClient();

  const insertData: FarmInsert = {
    user_id: params.userId,
    name: params.name,
    location: params.location,
    size_hectares: params.sizeHectares || null,
    farm_type: params.farmType || null,
  };

  const { data, error } = await supabase
    .from('farms')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create farm');
  }

  return data;
}

export async function getFarmsByUser(
  userId: string,
  page: number = 1,
  limit: number = 20,
  sortBy: 'created_at' | 'name' = 'created_at',
  order: 'asc' | 'desc' = 'desc'
): Promise<{ farms: Farm[]; total: number }> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('farms')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return { farms: data || [], total: count || 0 };
}

export async function getFarmById(farmId: string, userId: string): Promise<Farm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Farm not found');
  }

  return data;
}

export async function updateFarm(
  farmId: string,
  userId: string,
  updates: UpdateFarmParams
): Promise<Farm> {
  const supabase = await createClient();

  // Verify ownership
  const existing = await getFarmById(farmId, userId);
  if (!existing) {
    throw new AuthorizationError('You do not own this farm');
  }

  const updateData: FarmUpdate = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.sizeHectares !== undefined) updateData.size_hectares = updates.sizeHectares;
  if (updates.farmType !== undefined) updateData.farm_type = updates.farmType;

  const { data, error } = await supabase
    .from('farms')
    .update(updateData)
    .eq('id', farmId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to update farm');
  }

  return data;
}

export async function deleteFarm(farmId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Verify ownership
  await getFarmById(farmId, userId);

  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', farmId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
