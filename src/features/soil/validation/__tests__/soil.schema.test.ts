/**
 * Soil Schema Validation Unit Tests
 * Requirements: 12.1, 24.2, 24.6
 */

import { describe, it, expect } from '@jest/globals';
import { createSoilReportSchema, getSoilReportsQuerySchema } from '../soil.schema';

describe('Soil Schema Validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('createSoilReportSchema', () => {
    it('should validate valid soil report data', () => {
      const validData = {
        farmId: validUUID,
        phLevel: 6.5,
        nitrogen: 40,
        phosphorus: 25,
        potassium: 30,
        organicMatter: 4.2,
        recommendations: 'Apply NPK fertilizer in 2 weeks',
      };

      const result = createSoilReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject pH level out of bounds (0-14)', () => {
      const invalidData = {
        farmId: validUUID,
        phLevel: 15,
        nitrogen: 40,
        phosphorus: 25,
        potassium: 30,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative nutrient values', () => {
      const invalidData = {
        farmId: validUUID,
        phLevel: 7,
        nitrogen: -5,
        phosphorus: 25,
        potassium: 30,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for farmId', () => {
      const invalidData = {
        farmId: 'invalid-id',
        phLevel: 7,
        nitrogen: 10,
        phosphorus: 10,
        potassium: 10,
      };

      const result = createSoilReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getSoilReportsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const result = getSoilReportsQuerySchema.safeParse({
        farmId: validUUID,
        page: 2,
        limit: 10,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should apply defaults when page/limit omitted', () => {
      const result = getSoilReportsQuerySchema.safeParse({
        farmId: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });
});
