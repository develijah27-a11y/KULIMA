/**
 * Farm Validation Schemas
 *
 * Zod schemas for validating farm-related API requests.
 * Requirements: 12.1, 24.1, 24.6
 */

import { z } from 'zod';

const farmNameSchema = z
  .string({ message: 'Farm name is required' })
  .min(1, 'Farm name cannot be empty')
  .max(100, 'Farm name must be less than 100 characters')
  .trim();

const locationSchema = z
  .string({ message: 'Location is required' })
  .min(1, 'Location cannot be empty')
  .max(200, 'Location must be less than 200 characters')
  .trim();

const sizeHectaresSchema = z
  .number({ message: 'Size must be a number' })
  .positive('Size must be greater than 0')
  .max(1000000, 'Size must be less than 1,000,000 hectares')
  .optional();

const farmTypeSchema = z
  .string({ message: 'Farm type must be a string' })
  .min(1, 'Farm type cannot be empty')
  .max(50, 'Farm type must be less than 50 characters')
  .trim()
  .optional();

const sortBySchema = z
  .enum(['created_at', 'name'] as const, {
    message: "Sort field must be either 'created_at' or 'name'",
  })
  .optional()
  .default('created_at');

const orderSchema = z
  .enum(['asc', 'desc'] as const, {
    message: "Sort order must be either 'asc' or 'desc'",
  })
  .optional()
  .default('desc');

const pageSchema = z
  .number({ message: 'Page must be a number' })
  .int('Page must be an integer')
  .positive('Page must be greater than 0')
  .optional()
  .default(1);

const limitSchema = z
  .number({ message: 'Limit must be a number' })
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit must be at most 100')
  .optional()
  .default(20);

// district/crop_types/description/boundary use the same snake_case as the
// `farms` table columns (Database['public']['Tables']['farms']) rather than
// camelCase like the fields above — this schema previously only declared
// name/location/sizeHectares/farmType, so Zod's default "strip unknown
// keys" behavior silently discarded every one of these fields from every
// farm ever created or edited through this form: crop types, notes, and
// the entire GPS-walked boundary never reached the database at all.
const districtSchema = z.string().max(100).trim().optional();
const cropTypesSchema = z.array(z.string()).optional();
const descriptionSchema = z.string().max(2000).optional();
const boundarySchema = z.any().optional(); // GeoJSON Polygon — validated by PostGIS/jsonb column, not here

export const createFarmSchema = z.object({
  name: farmNameSchema,
  location: locationSchema,
  district: districtSchema,
  sizeHectares: sizeHectaresSchema,
  farmType: farmTypeSchema,
  cropTypes: cropTypesSchema,
  description: descriptionSchema,
  boundary: boundarySchema,
});

export const updateFarmSchema = z
  .object({
    name: farmNameSchema.optional(),
    location: locationSchema.optional(),
    district: districtSchema,
    sizeHectares: sizeHectaresSchema,
    farmType: farmTypeSchema,
    cropTypes: cropTypesSchema,
    description: descriptionSchema,
    boundary: boundarySchema,
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' }
  );

export const farmQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  sortBy: sortBySchema,
  order: orderSchema,
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;
export type FarmQueryInput = z.infer<typeof farmQuerySchema>;
