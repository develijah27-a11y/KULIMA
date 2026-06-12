/**
 * Disease detection feature validation schemas
 * 
 * This module exports all Zod validation schemas for the disease detection feature.
 */

export {
  createDiseaseScanSchema,
  getDiseaseScansQuerySchema,
  type CreateDiseaseScanInput,
  type GetDiseaseScansQuery,
} from './disease.schema';
