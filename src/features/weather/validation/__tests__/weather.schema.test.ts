import { describe, it, expect } from '@jest/globals';
import { createWeatherLogSchema, getWeatherLogsQuerySchema } from '../weather.schema';

describe('Weather Validation Schemas', () => {
  describe('createWeatherLogSchema', () => {
    it('should validate valid weather log data', () => {
      const validData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.5,
        humidity: 65.0,
        rainfall: 12.5,
        windSpeed: 15.2,
        conditions: 'Partly cloudy with light rain',
        recordedAt: '2024-01-15T10:30:00Z',
      };

      const result = createWeatherLogSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate without optional fields', () => {
      const minimalData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 28.0,
        humidity: 70.0,
        rainfall: 0.0,
        recordedAt: '2024-01-15T14:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        // Missing humidity, rainfall, recordedAt
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject humidity outside valid range (0-100)', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: 105.0, // Invalid: > 100
        rainfall: 5.0,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const humidityError = result.error.issues.find((issue) => issue.path[0] === 'humidity');
        expect(humidityError).toBeDefined();
        expect(humidityError?.message).toContain('100');
      }
    });

    it('should reject negative humidity', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: -5.0, // Invalid: < 0
        rainfall: 5.0,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative rainfall', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: 65.0,
        rainfall: -2.0, // Invalid: < 0
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const rainfallError = result.error.issues.find((issue) => issue.path[0] === 'rainfall');
        expect(rainfallError).toBeDefined();
      }
    });

    it('should reject negative wind speed', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 0.0,
        windSpeed: -10.0, // Invalid: < 0
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ISO 8601 timestamp format', () => {
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 5.0,
        recordedAt: '2024-01-15', // Invalid: missing time component
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const recordedError = result.error.issues.find((issue) => issue.path[0] === 'recordedAt');
        expect(recordedError).toBeDefined();
        expect(recordedError?.message).toContain('ISO 8601');
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        farmId: 'invalid-uuid',
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 5.0,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const farmIdError = result.error.issues.find((issue) => issue.path[0] === 'farmId');
        expect(farmIdError).toBeDefined();
        expect(farmIdError?.message).toContain('UUID');
      }
    });

    it('should accept extreme but valid temperatures', () => {
      const extremeData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: -40.0, // Very cold but valid
        humidity: 0.0,
        rainfall: 0.0,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(extremeData);
      expect(result.success).toBe(true);
    });

    it('should reject conditions that are too long', () => {
      const longConditions = 'A'.repeat(201);
      const invalidData = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 5.0,
        conditions: longConditions,
        recordedAt: '2024-01-15T10:00:00Z',
      };

      const result = createWeatherLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const conditionsError = result.error.issues.find((issue) => issue.path[0] === 'conditions');
        expect(conditionsError).toBeDefined();
        expect(conditionsError?.message).toContain('200');
      }
    });
  });

  describe('getWeatherLogsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        page: 2,
        limit: 50,
      };

      const result = getWeatherLogsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should validate without optional date filters', () => {
      const minimalQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = getWeatherLogsQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should apply default values for optional fields', () => {
      const queryWithoutPageLimit = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-01T00:00:00Z',
      };

      const result = getWeatherLogsQuerySchema.safeParse(queryWithoutPageLimit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject endDate before startDate', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z', // Invalid: before startDate
      };

      const result = getWeatherLogsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.issues.find((issue) => issue.path.includes('endDate'));
        expect(dateError).toBeDefined();
        expect(dateError?.message).toContain('after');
      }
    });

    it('should accept equal start and end dates', () => {
      const validQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const result = getWeatherLogsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject limit exceeding maximum', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 200, // Invalid: > 100
      };

      const result = getWeatherLogsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        page: 0, // Invalid: < 1
      };

      const result = getWeatherLogsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidQuery = {
        farmId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: 'not-a-date',
      };

      const result = getWeatherLogsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });
});
