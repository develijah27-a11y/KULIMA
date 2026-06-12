/**
 * Soil feature validation schemas
 * 
 * This module exports all Zod validation schemas for the soil feature.
 */

export {
  createSoilReportSchema,
  getSoilReportsQuerySchema,
  type CreateSoilReportInput,
  type GetSoilReportsQuery,
} from './soil.schema';
