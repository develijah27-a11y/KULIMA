/**
 * Pagination Utility
 * 
 * Provides consistent pagination calculations and response formatting
 * for API endpoints.
 * 
 * Requirements: 20.1, 20.6
 */

import { PaginationMeta, PaginatedResponse } from '@/types/api';

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Calculated pagination values
 */
export interface PaginationCalculation {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
}

/**
 * Calculate pagination values including offset and total pages
 * 
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Calculated pagination values
 * 
 * @example
 * ```typescript
 * const pagination = calculatePagination(2, 20, 100);
 * // Returns: { page: 2, limit: 20, offset: 20, totalPages: 5 }
 * ```
 */
export function calculatePagination(
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
  total: number = 0
): PaginationCalculation {
  // Normalize and validate inputs
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.max(
    MIN_LIMIT,
    Math.min(MAX_LIMIT, Math.floor(limit))
  );

  // Calculate offset
  const offset = (normalizedPage - 1) * normalizedLimit;

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset,
    totalPages,
  };
}

/**
 * Build pagination metadata for API responses
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 * 
 * @example
 * ```typescript
 * const meta = buildPaginationMeta(2, 20, 100);
 * // Returns: { page: 2, limit: 20, total: 100, totalPages: 5 }
 * ```
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const { page: normalizedPage, limit: normalizedLimit, totalPages } =
    calculatePagination(page, limit, total);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total,
    totalPages,
  };
}

/**
 * Build a complete paginated response with items and metadata
 * 
 * @param items - Array of items for current page
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Formatted paginated response
 * 
 * @example
 * ```typescript
 * const farms = await getFarms(page, limit);
 * const response = buildPaginatedResponse(farms, page, limit, totalCount);
 * // Returns: { items: [...], pagination: { page, limit, total, totalPages } }
 * ```
 */
export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const pagination = buildPaginationMeta(page, limit, total);

  return {
    items,
    pagination,
  };
}

/**
 * Validate pagination parameters
 * 
 * @param params - Pagination parameters to validate
 * @returns Validated pagination parameters
 * 
 * @example
 * ```typescript
 * const params = validatePaginationParams({ page: 0, limit: 200 });
 * // Returns: { page: 1, limit: 100 }
 * ```
 */
export function validatePaginationParams(
  params: PaginationParams
): Required<PaginationParams> {
  const page = params.page
    ? Math.max(1, Math.floor(params.page))
    : DEFAULT_PAGE;

  const limit = params.limit
    ? Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(params.limit)))
    : DEFAULT_LIMIT;

  return { page, limit };
}

/**
 * Extract pagination parameters from URL search params
 * 
 * @param searchParams - URL search params
 * @returns Validated pagination parameters
 * 
 * @example
 * ```typescript
 * const searchParams = new URLSearchParams('?page=2&limit=50');
 * const params = getPaginationFromSearchParams(searchParams);
 * // Returns: { page: 2, limit: 50 }
 * ```
 */
export function getPaginationFromSearchParams(
  searchParams: URLSearchParams
): Required<PaginationParams> {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  const page = pageParam ? parseInt(pageParam, 10) : undefined;
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  return validatePaginationParams({ page, limit });
}

/**
 * Check if there is a next page
 * 
 * @param page - Current page number
 * @param totalPages - Total number of pages
 * @returns True if there is a next page
 */
export function hasNextPage(page: number, totalPages: number): boolean {
  return page < totalPages;
}

/**
 * Check if there is a previous page
 * 
 * @param page - Current page number
 * @returns True if there is a previous page
 */
export function hasPreviousPage(page: number): boolean {
  return page > 1;
}
