import { describe, it, expect } from '@jest/globals';
import { createSoilReportSchema, getSoilReportsQuerySchema } from '../soil.schema';

describe('Soil Validation Schemas', () => {
  describe('createSoilReportSchema', () => {
    it('should validate valid soil report data', () => {
      const validData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 6.5,
        nitrogen: 45.5,
        phosphorus: 30.2,
        potassium: 25.8,
        organicMatter: 3.5,
        recommendations: 'Add lime to increase pH',
      };

      const result = createSoilReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate without optional fields', () => {
      const minimalData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 7.0,
        nitrogen: 50.0,
        phosphorus: 35.0,
        potassium: 20.0,
      };

      const result = createSoilReportSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 6.5,
        // Missing nitrogen, phosphorus, potassium
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject pH level outside valid range (0-14)', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 15.0, // Invalid: > 14
        nitrogen: 50.0,
        phosphorus: 35.0,
        potassium: 20.0,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const phError = result.error.issues.find((issue) => issue.path[0] === 'phLevel');
        expect(phError).toBeDefined();
        expect(phError?.message).toContain('14');
      }
    });

    it('should reject negative pH level', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: -1.0, // Invalid: < 0
        nitrogen: 50.0,
        phosphorus: 35.0,
        potassium: 20.0,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative nutrient values', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 7.0,
        nitrogen: -10.0, // Invalid: < 0
        phosphorus: 35.0,
        potassium: 20.0,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const nitrogenError = result.error.issues.find((issue) => issue.path[0] === 'nitrogen');
        expect(nitrogenError).toBeDefined();
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        farmId: 'not-a-valid-uuid',
        phLevel: 7.0,
        nitrogen: 50.0,
        phosphorus: 35.0,
        potassium: 20.0,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const farmIdError = result.error.issues.find((issue) => issue.path[0] === 'farmId');
        expect(farmIdError).toBeDefined();
        expect(farmIdError?.message).toContain('UUID');
      }
    });

    it('should reject recommendations that are too long', () => {
      const longRecommendations = 'A'.repeat(2001);
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        phLevel: 7.0,
        nitrogen: 50.0,
        phosphorus: 35.0,
        potassium: 20.0,
        recommendations: longRecommendations,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const recError = result.error.issues.find((issue) => issue.path[0] === 'recommendations');
        expect(recError).toBeDefined();
        expect(recError?.message).toContain('2000');
      }
    });
  });

  describe('getSoilReportsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: 2,
        limit: 50,
      };

      const result = getSoilReportsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      const minimalQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = getSoilReportsQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject limit exceeding maximum', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: 1,
        limit: 101, // Invalid: > 100
      };

      const result = getSoilReportsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.issues.find((issue) => issue.path[0] === 'limit');
        expect(limitError).toBeDefined();
        expect(limitError?.message).toContain('100');
      }
    });

    it('should reject page less than 1', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: 0, // Invalid: < 1
        limit: 20,
      };

      const result = getSoilReportsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });
});
