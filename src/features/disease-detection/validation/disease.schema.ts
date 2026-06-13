import { z } from 'zod';

/**
 * Zod validation schema for creating a disease scan
 * Requirements: 12.1, 24.3, 24.6
 */
export const createDiseaseScanSchema = z.object({
  farmId: z
    .string({ message: 'Farm ID is required' })
    .uuid('Farm ID must be a valid UUID'),

  cropType: z
    .string({ message: 'Crop type is required' })
    .trim()
    .min(1, 'Crop type cannot be empty')
    .max(100, 'Crop type must be at most 100 characters'),

  imageUrl: z
    .string({ message: 'Image URL is required' })
    .trim()
    .url('Image URL must be a valid URL')
    .max(500, 'Image URL must be at most 500 characters'),

  diseaseDetected: z
    .string({ message: 'Disease detected must be a string' })
    .trim()
    .max(200, 'Disease detected must be at most 200 characters')
    .optional(),

  confidenceScore: z
    .number({ message: 'Confidence score must be a number' })
    .min(0, 'Confidence score must be at least 0')
    .max(100, 'Confidence score must be at most 100')
    .finite('Confidence score must be a finite number')
    .optional(),

  treatmentRecommendations: z
    .string({ message: 'Treatment recommendations must be a string' })
    .trim()
    .max(2000, 'Treatment recommendations must be at most 2000 characters')
    .optional(),
});

export type CreateDiseaseScanInput = z.infer<typeof createDiseaseScanSchema>;

export const getDiseaseScansQuerySchema = z.object({
  farmId: z
    .string({ message: 'Farm ID is required' })
    .uuid('Farm ID must be a valid UUID'),

  page: z
    .number({ message: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),

  limit: z
    .number({ message: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional()
    .default(20),
});

export type GetDiseaseScansQuery = z.infer<typeof getDiseaseScansQuerySchema>;
