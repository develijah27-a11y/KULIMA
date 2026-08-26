/**
 * Soil Report Validation Schemas
 * Requirements: 12.1, 24.2, 24.6
 */

import { z } from 'zod';

export const createSoilReportSchema = z.object({
  farmId: z.string().uuid({ message: 'Valid farm ID is required' }),
  phLevel: z
    .number({ message: 'pH level must be a number' })
    .min(0, 'pH level must be at least 0')
    .max(14, 'pH level must be at most 14'),
  nitrogen: z
    .number({ message: 'Nitrogen must be a number' })
    .min(0, 'Nitrogen must be non-negative'),
  phosphorus: z
    .number({ message: 'Phosphorus must be a number' })
    .min(0, 'Phosphorus must be non-negative'),
  potassium: z
    .number({ message: 'Potassium must be a number' })
    .min(0, 'Potassium must be non-negative'),
  organicMatter: z
    .number({ message: 'Organic matter must be a number' })
    .min(0, 'Organic matter must be non-negative')
    .nullable()
    .optional(),
  recommendations: z
    .string()
    .max(2000, 'Recommendations must be at most 2000 characters')
    .trim()
    .nullable()
    .optional(),
});

export const getSoilReportsQuerySchema = z.object({
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

export type CreateSoilReportInput = z.infer<typeof createSoilReportSchema>;
export type GetSoilReportsQueryInput = z.infer<typeof getSoilReportsQuerySchema>;
