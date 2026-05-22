/**
 * Domain Types for Kulima AgriTech Platform
 * 
 * This file contains business logic types for all features.
 * These types extend the database types with additional business logic,
 * computed fields, and domain-specific structures.
 * 
 * References: Requirements R6.3, R6.4
 */

import { Database } from '@/lib/database.types';

// ============================================================================
// Database Type Aliases
// ============================================================================

type DbProfile = Database['public']['Tables']['profiles']['Row'];
type DbFarm = Database['public']['Tables']['farms']['Row'];
type DbCrop = Database['public']['Tables']['crops']['Row'];
type DbSoilReport = Database['public']['Tables']['soil_reports']['Row'];
type DbDiseaseScan = Database['public']['Tables']['disease_scans']['Row'];
type DbWeatherLog = Database['public']['Tables']['weather_logs']['Row'];

// ============================================================================
// Common Types
// ============================================================================

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata returned with list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Sort order for queries
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Date range filter for time-based queries
 */
export interface DateRangeFilter {
  startDate?: string | Date;
  endDate?: string | Date;
}

// ============================================================================
// Profile Types
// ============================================================================

/**
 * User profile domain type
 */
export interface Profile extends Omit<DbProfile, 'created_at' | 'updated_at'> {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parameters for creating a new profile
 */
export interface CreateProfileParams {
  userId: string;
  fullName: string;
  phoneNumber?: string;
  location?: string;
}

/**
 * Parameters for updating a profile
 */
export interface UpdateProfileParams {
  fullName?: string;
  phoneNumber?: string;
  location?: string;
}

/**
 * Profile with computed fields
 */
export interface ProfileWithStats extends Profile {
  farmCount: number;
  totalFarmArea: number;
}

// ============================================================================
// Farm Types
// ============================================================================

/**
 * Farm domain type
 */
export interface Farm extends Omit<DbFarm, 'created_at' | 'updated_at'> {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parameters for creating a new farm
 */
export interface CreateFarmParams {
  userId: string;
  name: string;
  location: string;
  sizeHectares?: number;
  farmType?: string;
}

/**
 * Parameters for updating a farm
 */
export interface UpdateFarmParams {
  name?: string;
  location?: string;
  sizeHectares?: number;
  farmType?: string;
}

/**
 * Farm filter options
 */
export interface FarmFilter {
  userId?: string;
  farmType?: string;
  minSize?: number;
  maxSize?: number;
  location?: string;
}

/**
 * Farm sort options
 */
export interface FarmSort {
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'size_hectares';
  order?: SortOrder;
}

/**
 * Farm with related data and computed fields
 */
export interface FarmWithDetails extends Farm {
  cropCount: number;
  soilReportCount: number;
  diseaseScanCount: number;
  weatherLogCount: number;
  lastSoilReport?: SoilReport;
  lastWeatherLog?: WeatherLog;
}

/**
 * Farm list query parameters
 */
export interface FarmListParams extends PaginationParams, FarmSort, FarmFilter {}

// ============================================================================
// Crop Types
// ============================================================================

/**
 * Crop domain type
 */
export interface Crop extends Omit<DbCrop, 'created_at' | 'updated_at' | 'planting_date' | 'expected_harvest_date'> {
  plantingDate: Date | null;
  expectedHarvestDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crop status enum
 */
export type CropStatus = 'planted' | 'growing' | 'harvested' | 'failed';

/**
 * Parameters for creating a new crop
 */
export interface CreateCropParams {
  farmId: string;
  cropName: string;
  variety?: string;
  plantingDate?: Date | string;
  expectedHarvestDate?: Date | string;
  status?: CropStatus;
}

/**
 * Parameters for updating a crop
 */
export interface UpdateCropParams {
  cropName?: string;
  variety?: string;
  plantingDate?: Date | string;
  expectedHarvestDate?: Date | string;
  status?: CropStatus;
}

/**
 * Crop filter options
 */
export interface CropFilter {
  farmId?: string;
  status?: CropStatus;
  cropName?: string;
}

/**
 * Crop sort options
 */
export interface CropSort {
  sortBy?: 'crop_name' | 'planting_date' | 'expected_harvest_date' | 'created_at';
  order?: SortOrder;
}

/**
 * Crop with computed fields
 */
export interface CropWithDetails extends Crop {
  daysUntilHarvest?: number;
  daysGrowing?: number;
  isOverdue?: boolean;
}

/**
 * Crop list query parameters
 */
export interface CropListParams extends PaginationParams, CropSort, CropFilter {}

// ============================================================================
// Soil Report Types
// ============================================================================

/**
 * Soil report domain type
 */
export interface SoilReport extends Omit<DbSoilReport, 'created_at'> {
  createdAt: Date;
}

/**
 * Parameters for creating a new soil report
 */
export interface CreateSoilReportParams {
  farmId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number;
  recommendations?: string;
}

/**
 * Soil health status based on nutrient levels
 */
export type SoilHealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Soil report filter options
 */
export interface SoilReportFilter {
  farmId?: string;
  minPhLevel?: number;
  maxPhLevel?: number;
  dateRange?: DateRangeFilter;
}

/**
 * Soil report sort options
 */
export interface SoilReportSort {
  sortBy?: 'created_at' | 'ph_level';
  order?: SortOrder;
}

/**
 * Soil report with computed health status
 */
export interface SoilReportWithAnalysis extends SoilReport {
  healthStatus: SoilHealthStatus;
  npkRatio: string;
  deficiencies: string[];
  strengths: string[];
}

/**
 * Soil report list query parameters
 */
export interface SoilReportListParams extends PaginationParams, SoilReportSort, SoilReportFilter {}

/**
 * Soil nutrient levels for analysis
 */
export interface SoilNutrients {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number;
}

// ============================================================================
// Disease Scan Types
// ============================================================================

/**
 * Disease scan domain type
 */
export interface DiseaseScan extends Omit<DbDiseaseScan, 'created_at'> {
  createdAt: Date;
}

/**
 * Parameters for creating a new disease scan
 */
export interface CreateDiseaseScanParams {
  farmId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected?: string;
  confidenceScore?: number;
  treatmentRecommendations?: string;
}

/**
 * Disease severity level
 */
export type DiseaseSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Disease scan filter options
 */
export interface DiseaseScanFilter {
  farmId?: string;
  cropType?: string;
  diseaseDetected?: string;
  minConfidence?: number;
  dateRange?: DateRangeFilter;
}

/**
 * Disease scan sort options
 */
export interface DiseaseScanSort {
  sortBy?: 'created_at' | 'confidence_score';
  order?: SortOrder;
}

/**
 * Disease scan with computed severity
 */
export interface DiseaseScanWithAnalysis extends DiseaseScan {
  severity?: DiseaseSeverity;
  isConfirmed: boolean;
  requiresAction: boolean;
}

/**
 * Disease scan list query parameters
 */
export interface DiseaseScanListParams extends PaginationParams, DiseaseScanSort, DiseaseScanFilter {}

/**
 * Disease detection result
 */
export interface DiseaseDetectionResult {
  diseaseDetected: string;
  confidenceScore: number;
  severity: DiseaseSeverity;
  treatmentRecommendations: string;
  preventiveMeasures: string[];
}

// ============================================================================
// Weather Log Types
// ============================================================================

/**
 * Weather log domain type
 */
export interface WeatherLog extends Omit<DbWeatherLog, 'created_at' | 'recorded_at'> {
  recordedAt: Date;
  createdAt: Date;
}

/**
 * Parameters for creating a new weather log
 */
export interface CreateWeatherLogParams {
  farmId: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed?: number;
  conditions?: string;
  recordedAt: Date | string;
}

/**
 * Weather conditions enum
 */
export type WeatherCondition = 
  | 'sunny' 
  | 'cloudy' 
  | 'rainy' 
  | 'stormy' 
  | 'foggy' 
  | 'windy' 
  | 'partly_cloudy';

/**
 * Weather log filter options
 */
export interface WeatherLogFilter {
  farmId?: string;
  conditions?: WeatherCondition;
  minTemperature?: number;
  maxTemperature?: number;
  minRainfall?: number;
  dateRange?: DateRangeFilter;
}

/**
 * Weather log sort options
 */
export interface WeatherLogSort {
  sortBy?: 'recorded_at' | 'created_at' | 'temperature' | 'rainfall';
  order?: SortOrder;
}

/**
 * Weather log with computed fields
 */
export interface WeatherLogWithAnalysis extends WeatherLog {
  temperatureCategory: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';
  humidityCategory: 'low' | 'moderate' | 'high';
  rainfallCategory: 'none' | 'light' | 'moderate' | 'heavy';
  isFavorableForFarming: boolean;
}

/**
 * Weather log list query parameters
 */
export interface WeatherLogListParams extends PaginationParams, WeatherLogSort, WeatherLogFilter {}

/**
 * Weather statistics for a date range
 */
export interface WeatherStats {
  averageTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  averageHumidity: number;
  totalRainfall: number;
  averageWindSpeed: number;
  mostCommonCondition: string;
  recordCount: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    fields?: Record<string, string[]>;
  };
}

/**
 * API response union type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the data type from a paginated response
 */
export type UnwrapPaginated<T> = T extends PaginatedResponse<infer U> ? U : never;

/**
 * Make specific fields required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Make specific fields optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Timestamp fields
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Entity with ID
 */
export interface WithId {
  id: string;
}

/**
 * Entity owned by a user
 */
export interface OwnedByUser {
  userId: string;
}

/**
 * Entity linked to a farm
 */
export interface LinkedToFarm {
  farmId: string;
}
