/**
 * Soil Feature Domain Types
 * Requirements: 8.3, 8.7, 15.1, 15.2, 15.3, 15.4, 15.5
 */

import type { Database } from '@/lib/database.types';

export type SoilReport = Database['public']['Tables']['soil_reports']['Row'];
export type SoilReportInsert = Database['public']['Tables']['soil_reports']['Insert'];
export type SoilReportUpdate = Database['public']['Tables']['soil_reports']['Update'];

export interface CreateSoilReportParams {
  farmId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number | null;
  recommendations?: string | null;
}

export interface GetSoilReportsParams {
  farmId: string;
  userId: string;
  page?: number;
  limit?: number;
}
