/**
 * Farm Validation Schemas
 * 
 * Zod schemas for validating farm-related API requests.
 * These schemas enforce runtime validation for farm creation, updates, and queries.
 * 
 * Requirements: 12.1, 24.1, 24.6
 */

import { z } from 'zod';

/**
 * Farm name validation schema
 * - Required field
 * - Must be between 1 and 100 characters
 */
const farmNameSchema = z
  .string({
    required_error: 'Farm name is required',
    invalid_type_error: 'Farm name must be a string',
  })
  .min(1, 'Farm name cannot be empty')
  .max(100, 'Farm name must be less than 100 characters')
  .trim();

/**
 * Location validation schema
 * - Required field
 * - Must be between 1 and 200 characters
 */
const locationSchema = z
  .string({
    required_error: 'Location is required',
    invalid_type_error: 'Location must be a string',
  })
  .min(1, 'Location cannot be empty')
  .max(200, 'Location must be less than 200 characters')
  .trim();

/**
 * Size in hectares validation schema
 * - Optional field
 * - Must be a positive number greater than 0
 * - Maximum 1,000,000 hectares (reasonable upper limit)
 */
const sizeHectaresSchema = z
  .number({
    invalid_type_error: 'Size must be a number',
  })
  .positive('Size must be greater than 0')
  .max(1000000, 'Size must be less than 1,000,000 hectares')
  .optional();

/**
 * Farm type validation schema
 * - Optional field
 * - Must be between 1 and 50 characters when provided
 */
const farmTypeSchema = z
  .string({
    invalid_type_error: 'Farm type must be a string',
  })
  .min(1, 'Farm type cannot be empty')
  .max(50, 'Farm type must be less than 50 characters')
  .trim()
  .optional();

/**
 * Sort field validation schema
 * - Must be either 'created_at' or 'name'
 */
const sortBySchema = z
  .enum(['created_at', 'name'], {
    errorMap: () => ({ message: "Sort field must be either 'created_at' or 'name'" }),
  })
  .optional()
  .default('created_at');

/**
 * Sort order validation schema
 * - Must be either 'asc' or 'desc'
 */
const orderSchema = z
  .enum(['asc', 'desc'], {
    errorMap: () => ({ message: "Sort order must be either 'asc' or 'desc'" }),
  })
  .optional()
  .default('desc');

/**
 * Page number validation schema
 * - Must be a positive integer
 * - Default: 1
 */
const pageSchema = z
  .number({
    invalid_type_error: 'Page must be a number',
  })
  .int('Page must be an integer')
  .positive('Page must be greater than 0')
  .optional()
  .default(1);

/**
 * Page limit validation schema
 * - Must be a positive integer
 * - Minimum: 1
 * - Maximum: 100
 * - Default: 20
 */
const limitSchema = z
  .number({
    invalid_type_error: 'Limit must be a number',
  })
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit must be at most 100')
  .optional()
  .default(20);

/**
 * Create farm validation schema
 * 
 * Validates farm creation requests with the following fields:
 * - name: Farm name (required, 1-100 characters)
 * - location: Farm location (required, 1-200 characters)
 * - sizeHectares: Farm size in hectares (optional, positive number)
 * - farmType: Type of farm (optional, 1-50 characters)
 * 
 * @example
 * ```typescript
 * const result = createFarmSchema.safeParse({
 *   name: 'Green Valley Farm',
 *   location: 'Kampala, Uganda',
 *   sizeHectares: 5.5,
 *   farmType: 'Mixed Crop and Livestock'
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export const createFarmSchema = z.object({
  name: farmNameSchema,
  location: locationSchema,
  sizeHectares: sizeHectaresSchema,
  farmType: farmTypeSchema,
});

/**
 * Update farm validation schema
 * 
 * Validates farm update requests with the following optional fields:
 * - name: Farm name (optional, 1-100 characters)
 * - location: Farm location (optional, 1-200 characters)
 * - sizeHectares: Farm size in hectares (optional, positive number)
 * - farmType: Type of farm (optional, 1-50 characters)
 * 
 * At least one field must be provided for update.
 * 
 * @example
 * ```typescript
 * const result = updateFarmSchema.safeParse({
 *   name: 'Updated Farm Name',
 *   sizeHectares: 10
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export const updateFarmSchema = z
  .object({
    name: farmNameSchema.optional(),
    location: locationSchema.optional(),
    sizeHectares: sizeHectaresSchema,
    farmType: farmTypeSchema,
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return (
        data.name !== undefined ||
        data.location !== undefined ||
        data.sizeHectares !== undefined ||
        data.farmType !== undefined
      );
    },
    {
      message: 'At least one field must be provided for update',
    }
  );

/**
 * Farm query validation schema
 * 
 * Validates farm list query parameters with the following fields:
 * - page: Page number (optional, positive integer, default: 1)
 * - limit: Items per page (optional, 1-100, default: 20)
 * - sortBy: Sort field (optional, 'created_at' or 'name', default: 'created_at')
 * - order: Sort order (optional, 'asc' or 'desc', default: 'desc')
 * 
 * @example
 * ```typescript
 * const result = farmQuerySchema.safeParse({
 *   page: 2,
 *   limit: 50,
 *   sortBy: 'name',
 *   order: 'asc'
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export const farmQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  sortBy: sortBySchema,
  order: orderSchema,
});

/**
 * TypeScript type inference from create farm schema
 * Can be used in TypeScript code for type safety
 */
export type CreateFarmInput = z.infer<typeof createFarmSchema>;

/**
 * TypeScript type inference from update farm schema
 * Can be used in TypeScript code for type safety
 */
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;

/**
 * TypeScript type inference from farm query schema
 * Can be used in TypeScript code for type safety
 */
export type FarmQueryInput = z.infer<typeof farmQuerySchema>;
