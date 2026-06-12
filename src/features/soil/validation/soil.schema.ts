import { z } from 'zod';

/**
 * Zod validation schema for creating a soil report
 * 
 * Validates:
 * - farmId: Required UUID string
 * - phLevel: Required number between 0 and 14 (valid pH range)
 * - nitrogen: Required non-negative number (kg/ha or ppm)
 * - phosphorus: Required non-negative number (kg/ha or ppm)
 * - potassium: Required non-negative number (kg/ha or ppm)
 * - organicMatter: Optional non-negative number (percentage)
 * - recommendations: Optional string for agronomic recommendations
 * 
 * Requirements: 12.1, 24.2, 24.6
 */
export const createSoilReportSchema = z.object({
  farmId: z
    .string({
      required_error: 'Farm ID is required',
      invalid_type_error: 'Farm ID must be a string',
    })
    .uuid('Farm ID must be a valid UUID'),

  phLevel: z
    .number({
      required_error: 'pH level is required',
      invalid_type_error: 'pH level must be a number',
    })
    .min(0, 'pH level must be at least 0')
    .max(14, 'pH level must be at most 14')
    .finite('pH level must be a finite number'),

  nitrogen: z
    .number({
      required_error: 'Nitrogen level is required',
      invalid_type_error: 'Nitrogen level must be a number',
    })
    .min(0, 'Nitrogen level must be non-negative')
    .finite('Nitrogen level must be a finite number'),

  phosphorus: z
    .number({
      required_error: 'Phosphorus level is required',
      invalid_type_error: 'Phosphorus level must be a number',
    })
    .min(0, 'Phosphorus level must be non-negative')
    .finite('Phosphorus level must be a finite number'),

  potassium: z
    .number({
      required_error: 'Potassium level is required',
      invalid_type_error: 'Potassium level must be a number',
    })
    .min(0, 'Potassium level must be non-negative')
    .finite('Potassium level must be a finite number'),

  organicMatter: z
    .number({
      invalid_type_error: 'Organic matter must be a number',
    })
    .min(0, 'Organic matter must be non-negative')
    .finite('Organic matter must be a finite number')
    .optional(),

  recommendations: z
    .string({
      invalid_type_error: 'Recommendations must be a string',
    })
    .trim()
    .max(2000, 'Recommendations must be at most 2000 characters')
    .optional(),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type CreateSoilReportInput = z.infer<typeof createSoilReportSchema>;

/**
 * Zod validation schema for querying soil reports
 * 
 * Validates query parameters for fetching soil reports by farm
 */
export const getSoilReportsQuerySchema = z.object({
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
export type GetSoilReportsQuery = z.infer<typeof getSoilReportsQuerySchema>;
