/**
 * Weather Log Schema Validation Unit Tests
 * Requirements: 12.1, 24.4, 24.6
 */

import { describe, it, expect } from '@jest/globals';
import { createWeatherLogSchema, getWeatherLogsQuerySchema } from '../weather.schema';

describe('Weather Log Schema Validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('createWeatherLogSchema', () => {
    it('should validate valid weather log data', () => {
      const validData = {
        farmId: validUUID,
        temperature: 28.5,
        humidity: 65,
        rainfall: 12.0,
        windSpeed: 8.5,
        conditions: 'Sunny',
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid humidity (>100 or <0)', () => {
      const invalidData = {
        farmId: validUUID,
        temperature: 25,
        humidity: 120,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative rainfall', () => {
      const invalidData = {
        farmId: validUUID,
        temperature: 25,
        humidity: 50,
        rainfall: -5,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ISO date string', () => {
      const invalidData = {
        farmId: validUUID,
        temperature: 25,
        humidity: 50,
        recordedAt: 'not-a-date',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getWeatherLogsQuerySchema', () => {
    it('should validate valid date range query', () => {
      const result = getWeatherLogsQuerySchema.safeParse({
        farmId: validUUID,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-07T00:00:00Z',
      });

      expect(result.success).toBe(true);
    });

    it('should reject when endDate is before startDate', () => {
      const result = getWeatherLogsQuerySchema.safeParse({
        farmId: validUUID,
        startDate: '2024-01-07T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z',
      });

      expect(result.success).toBe(false);
    });
  });
});
