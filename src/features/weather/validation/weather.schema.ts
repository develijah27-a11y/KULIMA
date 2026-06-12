import { z } from 'zod';

/**
 * Zod validation schema for creating a weather log
 * 
 * Validates:
 * - farmId: Required UUID string
 * - temperature: Required number (in Celsius)
 * - humidity: Required number between 0 and 100 (percentage)
 * - rainfall: Required non-negative number (in mm)
 * - windSpeed: Optional non-negative number (in km/h or m/s)
 * - conditions: Optional string describing weather conditions
 * - recordedAt: Required ISO 8601 timestamp string
 * 
 * Requirements: 12.1, 24.4, 24.6
 */
export const createWeatherLogSchema = z.object({
  farmId: z
    .string({
      required_error: 'Farm ID is required',
      invalid_type_error: 'Farm ID must be a string',
    })
    .uuid('Farm ID must be a valid UUID'),

  temperature: z
    .number({
      required_error: 'Temperature is required',
      invalid_type_error: 'Temperature must be a number',
    })
    .finite('Temperature must be a finite number'),

  humidity: z
    .number({
      required_error: 'Humidity is required',
      invalid_type_error: 'Humidity must be a number',
    })
    .min(0, 'Humidity must be at least 0')
    .max(100, 'Humidity must be at most 100')
    .finite('Humidity must be a finite number'),

  rainfall: z
    .number({
      required_error: 'Rainfall is required',
      invalid_type_error: 'Rainfall must be a number',
    })
    .min(0, 'Rainfall must be non-negative')
    .finite('Rainfall must be a finite number'),

  windSpeed: z
    .number({
      invalid_type_error: 'Wind speed must be a number',
    })
    .min(0, 'Wind speed must be non-negative')
    .finite('Wind speed must be a finite number')
    .optional(),

  conditions: z
    .string({
      invalid_type_error: 'Conditions must be a string',
    })
    .trim()
    .max(200, 'Conditions must be at most 200 characters')
    .optional(),

  recordedAt: z
    .string({
      required_error: 'Recorded at timestamp is required',
      invalid_type_error: 'Recorded at must be a string',
    })
    .datetime('Recorded at must be a valid ISO 8601 timestamp'),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type CreateWeatherLogInput = z.infer<typeof createWeatherLogSchema>;

/**
 * Zod validation schema for querying weather logs
 * 
 * Validates query parameters for fetching weather logs by farm with optional date range filtering
 */
export const getWeatherLogsQuerySchema = z.object({
  farmId: z
    .string({
      required_error: 'Farm ID is required',
      invalid_type_error: 'Farm ID must be a string',
    })
    .uuid('Farm ID must be a valid UUID'),

  startDate: z
    .string({
      invalid_type_error: 'Start date must be a string',
    })
    .datetime('Start date must be a valid ISO 8601 date')
    .optional(),

  endDate: z
    .string({
      invalid_type_error: 'End date must be a string',
    })
    .datetime('End date must be a valid ISO 8601 date')
    .optional(),

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
})
  .refine(
    (data) => {
      // If both dates are provided, endDate must be after startDate
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be equal to or after start date',
      path: ['endDate'],
    }
  );

/**
 * TypeScript type inferred from the query schema
 */
export type GetWeatherLogsQuery = z.infer<typeof getWeatherLogsQuerySchema>;
