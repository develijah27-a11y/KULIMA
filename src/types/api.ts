/**
 * API Contract Types
 * 
 * This file defines all request and response types for API endpoints.
 * These types ensure consistent API contracts between frontend and backend.
 * 
 * References: Requirements R6.5, R10.1-R10.4, R12.5, R12.7
 */

// ============================================================================
// Generic API Response Types
// ============================================================================

/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Field-level validation error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * API error details
 */
export interface ApiErrorDetails {
  message: string;
  fields?: Record<string, string[]>;
  code?: string;
}

/**
 * Standard error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetails;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// Authentication API Types
// ============================================================================

/**
 * User object returned in auth responses
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Profile object returned in auth responses
 */
export interface AuthProfile {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session object returned in auth responses
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * POST /api/auth/signup - Request body
 */
export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  location?: string;
}

/**
 * POST /api/auth/signup - Response data
 */
export interface SignupResponseData {
  user: AuthUser;
  profile: AuthProfile;
}

/**
 * POST /api/auth/signup - Full response
 */
export type SignupResponse = ApiResponse<SignupResponseData>;

/**
 * POST /api/auth/login - Request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login - Response data
 */
export interface LoginResponseData {
  user: AuthUser;
  session: AuthSession;
}

/**
 * POST /api/auth/login - Full response
 */
export type LoginResponse = ApiResponse<LoginResponseData>;

/**
 * POST /api/auth/logout - Response data
 */
export interface LogoutResponseData {
  message: string;
}

/**
 * POST /api/auth/logout - Full response
 */
export type LogoutResponse = ApiResponse<LogoutResponseData>;

// ============================================================================
// Farm API Types
// ============================================================================

/**
 * Farm object in API responses
 */
export interface Farm {
  id: string;
  userId: string;
  name: string;
  location: string;
  sizeHectares: number | null;
  farmType: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/farms - Query parameters
 */
export interface GetFarmsParams extends PaginationParams {
  sortBy?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

/**
 * GET /api/farms - Response data
 */
export interface GetFarmsResponseData {
  farms: Farm[];
  pagination: PaginationMeta;
}

/**
 * GET /api/farms - Full response
 */
export type GetFarmsResponse = ApiResponse<GetFarmsResponseData>;

/**
 * POST /api/farms - Request body
 */
export interface CreateFarmRequest {
  name: string;
  location: string;
  sizeHectares?: number;
  farmType?: string;
}

/**
 * POST /api/farms - Response data
 */
export interface CreateFarmResponseData {
  farm: Farm;
}

/**
 * POST /api/farms - Full response
 */
export type CreateFarmResponse = ApiResponse<CreateFarmResponseData>;

/**
 * GET /api/farms/[id] - Response data
 */
export interface GetFarmResponseData {
  farm: Farm;
}

/**
 * GET /api/farms/[id] - Full response
 */
export type GetFarmResponse = ApiResponse<GetFarmResponseData>;

/**
 * PUT /api/farms/[id] - Request body
 */
export interface UpdateFarmRequest {
  name?: string;
  location?: string;
  sizeHectares?: number;
  farmType?: string;
}

/**
 * PUT /api/farms/[id] - Response data
 */
export interface UpdateFarmResponseData {
  farm: Farm;
}

/**
 * PUT /api/farms/[id] - Full response
 */
export type UpdateFarmResponse = ApiResponse<UpdateFarmResponseData>;

/**
 * DELETE /api/farms/[id] - Response data
 */
export interface DeleteFarmResponseData {
  message: string;
}

/**
 * DELETE /api/farms/[id] - Full response
 */
export type DeleteFarmResponse = ApiResponse<DeleteFarmResponseData>;

// ============================================================================
// Soil Report API Types
// ============================================================================

/**
 * Soil report object in API responses
 */
export interface SoilReport {
  id: string;
  farmId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number | null;
  recommendations: string | null;
  createdAt: string;
}

/**
 * GET /api/soil-reports - Query parameters
 */
export interface GetSoilReportsParams extends PaginationParams {
  farmId: string;
}

/**
 * GET /api/soil-reports - Response data
 */
export interface GetSoilReportsResponseData {
  soilReports: SoilReport[];
  pagination: PaginationMeta;
}

/**
 * GET /api/soil-reports - Full response
 */
export type GetSoilReportsResponse = ApiResponse<GetSoilReportsResponseData>;

/**
 * POST /api/soil-reports - Request body
 */
export interface CreateSoilReportRequest {
  farmId: string;
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number;
  recommendations?: string;
}

/**
 * POST /api/soil-reports - Response data
 */
export interface CreateSoilReportResponseData {
  soilReport: SoilReport;
}

/**
 * POST /api/soil-reports - Full response
 */
export type CreateSoilReportResponse = ApiResponse<CreateSoilReportResponseData>;

/**
 * GET /api/soil-reports/[id] - Response data
 */
export interface GetSoilReportResponseData {
  soilReport: SoilReport;
}

/**
 * GET /api/soil-reports/[id] - Full response
 */
export type GetSoilReportResponse = ApiResponse<GetSoilReportResponseData>;

// ============================================================================
// Disease Scan API Types
// ============================================================================

/**
 * Disease scan object in API responses
 */
export interface DiseaseScan {
  id: string;
  farmId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected: string | null;
  confidenceScore: number | null;
  treatmentRecommendations: string | null;
  createdAt: string;
}

/**
 * GET /api/disease-scans - Query parameters
 */
export interface GetDiseaseScansParams extends PaginationParams {
  farmId: string;
}

/**
 * GET /api/disease-scans - Response data
 */
export interface GetDiseaseScansResponseData {
  diseaseScans: DiseaseScan[];
  pagination: PaginationMeta;
}

/**
 * GET /api/disease-scans - Full response
 */
export type GetDiseaseScansResponse = ApiResponse<GetDiseaseScansResponseData>;

/**
 * POST /api/disease-scans - Request body
 */
export interface CreateDiseaseScanRequest {
  farmId: string;
  cropType: string;
  imageUrl: string;
  diseaseDetected?: string;
  confidenceScore?: number;
  treatmentRecommendations?: string;
}

/**
 * POST /api/disease-scans - Response data
 */
export interface CreateDiseaseScanResponseData {
  diseaseScan: DiseaseScan;
}

/**
 * POST /api/disease-scans - Full response
 */
export type CreateDiseaseScanResponse = ApiResponse<CreateDiseaseScanResponseData>;

/**
 * GET /api/disease-scans/[id] - Response data
 */
export interface GetDiseaseScanResponseData {
  diseaseScan: DiseaseScan;
}

/**
 * GET /api/disease-scans/[id] - Full response
 */
export type GetDiseaseScanResponse = ApiResponse<GetDiseaseScanResponseData>;

// ============================================================================
// Weather Log API Types
// ============================================================================

/**
 * Weather log object in API responses
 */
export interface WeatherLog {
  id: string;
  farmId: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number | null;
  conditions: string | null;
  recordedAt: string;
  createdAt: string;
}

/**
 * GET /api/weather-logs - Query parameters
 */
export interface GetWeatherLogsParams extends PaginationParams {
  farmId: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /api/weather-logs - Response data
 */
export interface GetWeatherLogsResponseData {
  weatherLogs: WeatherLog[];
  pagination: PaginationMeta;
}

/**
 * GET /api/weather-logs - Full response
 */
export type GetWeatherLogsResponse = ApiResponse<GetWeatherLogsResponseData>;

/**
 * POST /api/weather-logs - Request body
 */
export interface CreateWeatherLogRequest {
  farmId: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed?: number;
  conditions?: string;
  recordedAt: string;
}

/**
 * POST /api/weather-logs - Response data
 */
export interface CreateWeatherLogResponseData {
  weatherLog: WeatherLog;
}

/**
 * POST /api/weather-logs - Full response
 */
export type CreateWeatherLogResponse = ApiResponse<CreateWeatherLogResponseData>;

/**
 * GET /api/weather-logs/[id] - Response data
 */
export interface GetWeatherLogResponseData {
  weatherLog: WeatherLog;
}

/**
 * GET /api/weather-logs/[id] - Full response
 */
export type GetWeatherLogResponse = ApiResponse<GetWeatherLogResponseData>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a response is a success response
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}
