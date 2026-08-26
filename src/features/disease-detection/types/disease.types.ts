/**
 * Disease Detection Domain Types
 * Requirements: 8.3, 8.7, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 */

import type { Database } from '@/lib/database.types';

export type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];
export type DiseaseScanInsert = Database['public']['Tables']['disease_scans']['Insert'];
export type DiseaseScanUpdate = Database['public']['Tables']['disease_scans']['Update'];

export interface CreateDiseaseScanParams {
  farmId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected?: string | null;
  confidenceScore?: number | null;
  treatmentRecommendations?: string | null;
}

export interface GetDiseaseScansParams {
  farmId: string;
  userId: string;
  page?: number;
  limit?: number;
}
