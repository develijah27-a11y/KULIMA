/**
 * Disease Detection Validation Schemas
 * Requirements: 12.1, 24.3, 24.6
 */

import { z } from 'zod';

export const createDiseaseScanSchema = z.object({
  farmId: z.string().uuid({ message: 'Valid farm ID is required' }),
  cropType: z
    .string({ message: 'Crop type is required' })
    .min(1, 'Crop type cannot be empty')
    .max(100, 'Crop type must be at most 100 characters')
    .trim(),
  imageUrl: z
    .string({ message: 'Image URL is required' })
    .url({ message: 'Must be a valid URL' })
    .max(500, 'Image URL must be at most 500 characters'),
  diseaseDetected: z
    .string()
    .max(200, 'Disease detected must be at most 200 characters')
    .trim()
    .nullable()
    .optional(),
  confidenceScore: z
    .number()
    .min(0, 'Confidence score must be at least 0')
    .max(100, 'Confidence score must be at most 100')
    .nullable()
    .optional(),
  treatmentRecommendations: z
    .string()
    .max(2000, 'Treatment recommendations must be at most 2000 characters')
    .trim()
    .nullable()
    .optional(),
});

export const getDiseaseScansQuerySchema = z.object({
  farmId: z.string().uuid({ message: 'Valid farm ID is required' }),
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

export type CreateDiseaseScanInput = z.infer<typeof createDiseaseScanSchema>;
export type GetDiseaseScansQueryInput = z.infer<typeof getDiseaseScansQuerySchema>;
