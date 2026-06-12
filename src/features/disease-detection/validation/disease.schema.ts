import { z } from 'zod';

/**
 * Zod validation schema for creating a disease scan
 * 
 * Validates:
 * - farmId: Required UUID string
 * - cropType: Required string identifying the crop
 * - imageUrl: Required valid URL string pointing to the uploaded image
 * - diseaseDetected: Optional string identifying the detected disease
 * - confidenceScore: Optional number between 0 and 100 (percentage)
 * - treatmentRecommendations: Optional string with treatment advice
 * 
 * Requirements: 12.1, 24.3, 24.6
 */
export const createDiseaseScanSchema = z.object({
  farmId: z
    .string({
      required_error: 'Farm ID is required',
      invalid_type_error: 'Farm ID must be a string',
    })
    .uuid('Farm ID must be a valid UUID'),

  cropType: z
    .string({
      required_error: 'Crop type is required',
      invalid_type_error: 'Crop type must be a string',
    })
    .trim()
    .min(1, 'Crop type cannot be empty')
    .max(100, 'Crop type must be at most 100 characters'),

  imageUrl: z
    .string({
      required_error: 'Image URL is required',
      invalid_type_error: 'Image URL must be a string',
    })
    .trim()
    .url('Image URL must be a valid URL')
    .max(500, 'Image URL must be at most 500 characters'),

  diseaseDetected: z
    .string({
      invalid_type_error: 'Disease detected must be a string',
    })
    .trim()
    .max(200, 'Disease detected must be at most 200 characters')
    .optional(),

  confidenceScore: z
    .number({
      invalid_type_error: 'Confidence score must be a number',
    })
    .min(0, 'Confidence score must be at least 0')
    .max(100, 'Confidence score must be at most 100')
    .finite('Confidence score must be a finite number')
    .optional(),

  treatmentRecommendations: z
    .string({
      invalid_type_error: 'Treatment recommendations must be a string',
    })
    .trim()
    .max(2000, 'Treatment recommendations must be at most 2000 characters')
    .optional(),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type CreateDiseaseScanInput = z.infer<typeof createDiseaseScanSchema>;

/**
 * Zod validation schema for querying disease scans
 * 
 * Validates query parameters for fetching disease scans by farm
 */
export const getDiseaseScansQuerySchema = z.object({
  farmId: z
    .string({
      required_error: 'Farm ID is required',
      invalid_type_error: 'Farm ID must be a string',
    })
    .uuid('Farm ID must be a valid UUID'),

  page: z
    .number({
      invalid_type_error: 'Page must be a number',
    })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),

  limit: z
    .number({
      invalid_type_error: 'Limit must be a number',
    })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional()
    .default(20),
});

/**
 * TypeScript type inferred from the query schema
 */
export type GetDiseaseScansQuery = z.infer<typeof getDiseaseScansQuerySchema>;
