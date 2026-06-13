import { z } from 'zod';

/**
 * Zod validation schema for creating a weather log
 * Requirements: 12.1, 24.4, 24.6
 */
export const createWeatherLogSchema = z.object({
  farmId: z
    .string({ message: 'Farm ID is required' })
    .uuid('Farm ID must be a valid UUID'),

  temperature: z
    .number({ message: 'Temperature is required' })
    .finite('Temperature must be a finite number'),

  humidity: z
    .number({ message: 'Humidity is required' })
    .min(0, 'Humidity must be at least 0')
    .max(100, 'Humidity must be at most 100')
    .finite('Humidity must be a finite number'),

  rainfall: z
    .number({ message: 'Rainfall is required' })
    .min(0, 'Rainfall must be non-negative')
    .finite('Rainfall must be a finite number'),

  windSpeed: z
    .number({ message: 'Wind speed must be a number' })
    .min(0, 'Wind speed must be non-negative')
    .finite('Wind speed must be a finite number')
    .optional(),

  conditions: z
    .string({ message: 'Conditions must be a string' })
    .trim()
    .max(200, 'Conditions must be at most 200 characters')
    .optional(),

  recordedAt: z
    .string({ message: 'Recorded at timestamp is required' })
    .datetime('Recorded at must be a valid ISO 8601 timestamp'),
});

export type CreateWeatherLogInput = z.infer<typeof createWeatherLogSchema>;

export const getWeatherLogsQuerySchema = z.object({
  farmId: z
    .string({ message: 'Farm ID is required' })
    .uuid('Farm ID must be a valid UUID'),

  startDate: z
    .string({ message: 'Start date must be a string' })
    .datetime('Start date must be a valid ISO 8601 date')
    .optional(),

  endDate: z
    .string({ message: 'End date must be a string' })
    .datetime('End date must be a valid ISO 8601 date')
    .optional(),

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
}).refine(
  (data) => {
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

export type GetWeatherLogsQuery = z.infer<typeof getWeatherLogsQuerySchema>;
