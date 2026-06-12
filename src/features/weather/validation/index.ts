/**
 * Weather feature validation schemas
 * 
 * This module exports all Zod validation schemas for the weather feature.
 */

export {
  createWeatherLogSchema,
  getWeatherLogsQuerySchema,
  type CreateWeatherLogInput,
  type GetWeatherLogsQuery,
} from './weather.schema';
