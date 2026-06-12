import { describe, it, expect } from '@jest/globals';
import { createDiseaseScanSchema, getDiseaseScansQuerySchema } from '../disease.schema';

describe('Disease Detection Validation Schemas', () => {
  describe('createDiseaseScanSchema', () => {
    it('should validate valid disease scan data', () => {
      const validData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Maize',
        imageUrl: 'https://example.com/images/scan123.jpg',
        diseaseDetected: 'Maize Streak Virus',
        confidenceScore: 85.5,
        treatmentRecommendations: 'Remove infected plants and control leafhopper vectors',
      };

      const result = createDiseaseScanSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate without optional fields', () => {
      const minimalData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Tomato',
        imageUrl: 'https://storage.supabase.co/bucket/scan456.png',
      };

      const result = createDiseaseScanSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing cropType and imageUrl
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject confidence score outside valid range (0-100)', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Rice',
        imageUrl: 'https://example.com/scan.jpg',
        confidenceScore: 150.0, // Invalid: > 100
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const scoreError = result.error.issues.find((issue) => issue.path[0] === 'confidenceScore');
        expect(scoreError).toBeDefined();
        expect(scoreError?.message).toContain('100');
      }
    });

    it('should reject negative confidence score', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Wheat',
        imageUrl: 'https://example.com/scan.jpg',
        confidenceScore: -5.0, // Invalid: < 0
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Cassava',
        imageUrl: 'not-a-valid-url', // Invalid URL
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const urlError = result.error.issues.find((issue) => issue.path[0] === 'imageUrl');
        expect(urlError).toBeDefined();
        expect(urlError?.message).toContain('URL');
      }
    });

    it('should reject empty crop type', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: '   ', // Empty after trimming
        imageUrl: 'https://example.com/scan.jpg',
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const cropError = result.error.issues.find((issue) => issue.path[0] === 'cropType');
        expect(cropError).toBeDefined();
      }
    });

    it('should reject treatment recommendations that are too long', () => {
      const longTreatment = 'A'.repeat(2001);
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        cropType: 'Sorghum',
        imageUrl: 'https://example.com/scan.jpg',
        treatmentRecommendations: longTreatment,
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const treatmentError = result.error.issues.find(
          (issue) => issue.path[0] === 'treatmentRecommendations'
        );
        expect(treatmentError).toBeDefined();
        expect(treatmentError?.message).toContain('2000');
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        farmId: 'not-a-uuid',
        cropType: 'Beans',
        imageUrl: 'https://example.com/scan.jpg',
      };

      const result = createDiseaseScanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const farmIdError = result.error.issues.find((issue) => issue.path[0] === 'farmId');
        expect(farmIdError).toBeDefined();
        expect(farmIdError?.message).toContain('UUID');
      }
    });
  });

  describe('getDiseaseScansQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: 3,
        limit: 25,
      };

      const result = getDiseaseScansQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      const minimalQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = getDiseaseScansQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject limit exceeding maximum', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 150, // Invalid: > 100
      };

      const result = getDiseaseScansQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: -1, // Invalid: < 1
      };

      const result = getDiseaseScansQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });
});
