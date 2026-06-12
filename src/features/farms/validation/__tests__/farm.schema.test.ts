/**
 * Farm Validation Schemas Tests
 * 
 * Tests for farm validation schemas to ensure proper validation
 * of farm creation, update, and query parameters.
 */

import { describe, it, expect } from '@jest/globals';
import {
  createFarmSchema,
  updateFarmSchema,
  farmQuerySchema,
} from '../farm.schema';

describe('Farm Validation Schemas', () => {
  describe('createFarmSchema', () => {
    it('should validate valid farm creation data', () => {
      const validData = {
        name: 'Green Valley Farm',
        location: 'Kampala, Uganda',
        sizeHectares: 5.5,
        farmType: 'Mixed Crop and Livestock',
      };

      const result = createFarmSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate with only required fields', () => {
      const validData = {
        name: 'Simple Farm',
        location: 'Nairobi, Kenya',
      };

      const result = createFarmSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const invalidData = {
        location: 'Kampala, Uganda',
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing location', () => {
      const invalidData = {
        name: 'Test Farm',
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        location: 'Test Location',
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        location: 'Test Location',
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative size', () => {
      const invalidData = {
        name: 'Test Farm',
        location: 'Test Location',
        sizeHectares: -5,
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero size', () => {
      const invalidData = {
        name: 'Test Farm',
        location: 'Test Location',
        sizeHectares: 0,
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject size exceeding maximum', () => {
      const invalidData = {
        name: 'Test Farm',
        location: 'Test Location',
        sizeHectares: 1000001,
      };

      const result = createFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from string fields', () => {
      const dataWithWhitespace = {
        name: '  Test Farm  ',
        location: '  Test Location  ',
        farmType: '  Mixed Farm  ',
      };

      const result = createFarmSchema.safeParse(dataWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Farm');
        expect(result.data.location).toBe('Test Location');
        expect(result.data.farmType).toBe('Mixed Farm');
      }
    });
  });

  describe('updateFarmSchema', () => {
    it('should validate update with all fields', () => {
      const validData = {
        name: 'Updated Farm',
        location: 'New Location',
        sizeHectares: 10,
        farmType: 'Crop Farm',
      };

      const result = updateFarmSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate update with single field', () => {
      const validData = {
        name: 'Updated Farm',
      };

      const result = updateFarmSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate update with partial fields', () => {
      const validData = {
        sizeHectares: 15,
        farmType: 'Livestock Farm',
      };

      const result = updateFarmSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject update with no fields', () => {
      const invalidData = {};

      const result = updateFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid field values', () => {
      const invalidData = {
        sizeHectares: -10,
      };

      const result = updateFarmSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('farmQuerySchema', () => {
    it('should validate with default values', () => {
      const result = farmQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('created_at');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate custom pagination', () => {
      const validData = {
        page: 2,
        limit: 50,
      };

      const result = farmQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should validate custom sorting', () => {
      const validData = {
        sortBy: 'name' as const,
        order: 'asc' as const,
      };

      const result = farmQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('name');
        expect(result.data.order).toBe('asc');
      }
    });

    it('should reject invalid sortBy value', () => {
      const invalidData = {
        sortBy: 'invalid',
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid order value', () => {
      const invalidData = {
        order: 'invalid',
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative page number', () => {
      const invalidData = {
        page: -1,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero page number', () => {
      const invalidData = {
        page: 0,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject limit below minimum', () => {
      const invalidData = {
        limit: 0,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject limit above maximum', () => {
      const invalidData = {
        limit: 101,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer page', () => {
      const invalidData = {
        page: 1.5,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const invalidData = {
        limit: 20.5,
      };

      const result = farmQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
