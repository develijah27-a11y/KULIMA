import { z } from 'zod';

/**
 * Zod validation schema for creating a soil report
 * Requirements: 12.1, 24.2, 24.6
 */
export const createSoilReportSchema = z.object({
  farmId: z
    .string({ message: 'Farm ID is required' })
    .uuid('Farm ID must be a valid UUID'),

  phLevel: z
    .number({ message: 'pH level is required' })
    .min(0, 'pH level must be at least 0')
    .max(14, 'pH level must be at most 14')
    .finite('pH level must be a finite number'),

  nitrogen: z
    .number({ message: 'Nitrogen level is required' })
    .min(0, 'Nitrogen level must be non-negative')
    .finite('Nitrogen level must be a finite number'),

  phosphorus: z
    .number({ message: 'Phosphorus level is required' })
    .min(0, 'Phosphorus level must be non-negative')
    .finite('Phosphorus level must be a finite number'),

  potassium: z
    .number({ message: 'Potassium level is required' })
    .min(0, 'Potassium level must be non-negative')
    .finite('Potassium level must be a finite number'),

  organicMatter: z
    .number({ message: 'Organic matter must be a number' })
    .min(0, 'Organic matter must be non-negative')
    .finite('Organic matter must be a finite number')
    .optional(),

  recommendations: z
    .string({ message: 'Recommendations must be a string' })
    .trim()
    .max(2000, 'Recommendations must be at most 2000 characters')
    .optional(),
});

export type CreateSoilReportInput = z.infer<typeof createSoilReportSchema>;

export const getSoilReportsQuerySchema = z.object({
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

export type GetSoilReportsQuery = z.infer<typeof getSoilReportsQuerySchema>;
