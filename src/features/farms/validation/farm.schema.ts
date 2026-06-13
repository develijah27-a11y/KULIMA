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
  .enum(['created_at', 'name'], {
    errorMap: () => ({ message: "Sort field must be either 'created_at' or 'name'" }),
  })
  .optional()
  .default('created_at');

const orderSchema = z
  .enum(['asc', 'desc'], {
    errorMap: () => ({ message: "Sort order must be either 'asc' or 'desc'" }),
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

export const createFarmSchema = z.object({
  name: farmNameSchema,
  location: locationSchema,
  sizeHectares: sizeHectaresSchema,
  farmType: farmTypeSchema,
});

export const updateFarmSchema = z
  .object({
    name: farmNameSchema.optional(),
    location: locationSchema.optional(),
    sizeHectares: sizeHectaresSchema,
    farmType: farmTypeSchema,
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.location !== undefined ||
      data.sizeHectares !== undefined ||
      data.farmType !== undefined,
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
