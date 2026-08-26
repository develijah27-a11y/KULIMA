/**
 * Disease Detection Schema Validation Unit Tests
 * Requirements: 12.1, 24.3, 24.6
 */

import { describe, it, expect } from '@jest/globals';
import { createDiseaseScanSchema, getDiseaseScansQuerySchema } from '../disease.schema';

describe('Disease Detection Schema Validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('createDiseaseScanSchema', () => {
    it('should validate valid disease scan data', () => {
      const validData = {
        farmId: validUUID,
        cropType: 'Maize',
        imageUrl: 'https://storage.supabase.co/scans/maize_leaf.jpg',
        diseaseDetected: 'Maize Streak Virus',
        confidenceScore: 88.5,
        treatmentRecommendations: 'Isolate affected plants and control vector insects',
      };

      const result = createDiseaseScanSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid imageUrl', () => {
      const invalidData = {
        farmId: validUUID,
        cropType: 'Maize',
        imageUrl: 'not-a-valid-url',
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject confidenceScore out of bounds (> 100 or < 0)', () => {
      const invalidData = {
        farmId: validUUID,
        cropType: 'Maize',
        imageUrl: 'https://example.com/leaf.jpg',
        confidenceScore: 105,
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty cropType', () => {
      const invalidData = {
        farmId: validUUID,
        cropType: '',
        imageUrl: 'https://example.com/leaf.jpg',
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getDiseaseScansQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const result = getDiseaseScansQuerySchema.safeParse({
        farmId: validUUID,
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });
  });
});
