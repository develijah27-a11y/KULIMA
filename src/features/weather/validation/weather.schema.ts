/**
 * Weather Log Validation Schemas
 * Requirements: 12.1, 24.4, 24.6
 */

import { z } from 'zod';

export const createWeatherLogSchema = z.object({
  farmId: z.string().uuid({ message: 'Valid farm ID is required' }),
  temperature: z
    .number({ message: 'Temperature must be a number' })
    .min(-50, 'Temperature must be at least -50°C')
    .max(70, 'Temperature must be at most 70°C'),
  humidity: z
    .number({ message: 'Humidity must be a number' })
    .min(0, 'Humidity must be at least 0%')
    .max(100, 'Humidity must be at most 100%'),
  rainfall: z
    .number({ message: 'Rainfall must be a number' })
    .min(0, 'Rainfall must be non-negative')
    .optional()
    .default(0),
  windSpeed: z
    .number({ message: 'Wind speed must be a number' })
    .min(0, 'Wind speed must be non-negative')
    .nullable()
    .optional(),
  conditions: z
    .string()
    .max(200, 'Conditions must be at most 200 characters')
    .trim()
    .nullable()
    .optional(),
  recordedAt: z
    .string({ message: 'Recorded at date is required' })
    .datetime({ message: 'Must be a valid ISO 8601 timestamp' }),
});

export const getWeatherLogsQuerySchema = z
  .object({
    farmId: z.string().uuid({ message: 'Valid farm ID is required' }),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
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
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

export type CreateWeatherLogInput = z.infer<typeof createWeatherLogSchema>;
export type GetWeatherLogsQueryInput = z.infer<typeof getWeatherLogsQuerySchema>;
