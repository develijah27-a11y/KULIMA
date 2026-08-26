import type { Database } from '@/lib/database.types';

export type Farm = Database['public']['Tables']['farms']['Row'];
export type FarmInsert = Database['public']['Tables']['farms']['Insert'];
export type FarmUpdate = Database['public']['Tables']['farms']['Update'];

export interface CreateFarmInput {
  name: string;
  location: string;
  district?: string | null;
  sizeHectares?: number | null;
  farmType?: string | null;
  cropTypes?: string[] | null;
  description?: string | null;
  boundary?: unknown;
}

export interface UpdateFarmInput {
  name?: string;
  location?: string;
  district?: string | null;
  sizeHectares?: number | null;
  farmType?: string | null;
  cropTypes?: string[] | null;
  description?: string | null;
  boundary?: unknown;
}
