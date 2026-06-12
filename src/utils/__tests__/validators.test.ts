/**
 * Unit tests for validators utility
 * 
 * Tests all validation functions including UUID, date range, sanitization,
 * email, phone, URL, numeric range, and ISO date validation.
 */

import {
  validateUUID,
  assertUUID,
  validateDateRange,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateURL,
  validateRange,
  validateISODate,
} from '../validators';

describe('validators utility', () => {
  describe('validateUUID', () => {
    it('should validate valid UUID v4', () => {
      const validUUIDs = [
        '123e4567-e89b-42d3-a456-426614174000', // v4 (has '4' in version position)
        'a1b2c3d4-e5f6-4789-a012-345678901234', // v4
        '550e8400-e29b-41d4-a716-446655440000', // v4
      ];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456', // too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // too long
        '123e4567-e89b-22d3-a456-426614174000', // wrong version (v2 instead of v4)
        '',
        '   ',
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });

    it('should reject non-string values', () => {
      expect(validateUUID(null as any)).toBe(false);
      expect(validateUUID(undefined as any)).toBe(false);
      expect(validateUUID(123 as any)).toBe(false);
      expect(validateUUID({} as any)).toBe(false);
    });
  });

  describe('assertUUID', () => {
    it('should not throw for valid UUID', () => {
      expect(() => {
        assertUUID('123e4567-e89b-42d3-a456-426614174000'); // v4 UUID
      }).not.toThrow();
    });

    it('should throw for invalid UUID with default field name', () => {
      expect(() => {
        assertUUID('invalid-uuid');
      }).toThrow('ID must be a valid UUID');
    });

    it('should throw for invalid UUID with custom field name', () => {
      expect(() => {
        assertUUID('invalid-uuid', 'farmId');
      }).toThrow('farmId must be a valid UUID');
    });
  });

  describe('validateDateRange', () => {
    it('should validate valid date range', () => {
      const result = validateDateRange('2024-01-01', '2024-12-31');
      
      expect(result.isValid).toBe(true);
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should accept Date objects', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const result = validateDateRange(startDate, endDate);
      
      expect(result.isValid).toBe(true);
      expect(result.startDate).toBe(startDate);
      expect(result.endDate).toBe(endDate);
    });

    it('should reject end date before start date', () => {
      const result = validateDateRange('2024-12-31', '2024-01-01');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('End date must be equal to or after start date');
    });

    it('should allow equal start and end dates', () => {
      const result = validateDateRange('2024-01-01', '2024-01-01');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid date strings', () => {
      let result = validateDateRange('invalid-date', '2024-12-31');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date is not a valid date');

      result = validateDateRange('2024-01-01', 'invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('End date is not a valid date');
    });

    it('should validate with required option', () => {
      let result = validateDateRange(undefined, undefined, { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both start date and end date are required');

      result = validateDateRange('2024-01-01', undefined, { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both start date and end date are required');

      result = validateDateRange(undefined, '2024-12-31', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both start date and end date are required');
    });

    it('should allow missing dates when not required', () => {
      const result = validateDateRange(undefined, undefined, { required: false });
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject future dates when allowFuture is false', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = validateDateRange(
        futureDate.toISOString(),
        futureDate.toISOString(),
        { allowFuture: false }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date cannot be in the future');
    });

    it('should allow future dates when allowFuture is true', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = validateDateRange(
        futureDate.toISOString(),
        futureDate.toISOString(),
        { allowFuture: true }
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should enforce maxRangeDays limit', () => {
      const result = validateDateRange(
        '2024-01-01',
        '2024-12-31',
        { maxRangeDays: 30 }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date range cannot exceed 30 days');
    });

    it('should allow range within maxRangeDays', () => {
      const result = validateDateRange(
        '2024-01-01',
        '2024-01-15',
        { maxRangeDays: 30 }
      );
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace by default', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\t\nhello\n\t')).toBe('hello');
    });

    it('should remove HTML tags by default', () => {
      expect(sanitizeInput('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('Hello <b>World</b>!')).toBe('Hello World!');
    });

    it('should preserve whitespace when trim is false', () => {
      expect(sanitizeInput('  hello  ', { trim: false })).toBe('  hello  ');
    });

    it('should preserve HTML when removeHtml is false', () => {
      expect(sanitizeInput('<p>Hello</p>', { removeHtml: false })).toBe('<p>Hello</p>');
    });

    it('should truncate to maxLength', () => {
      expect(sanitizeInput('Hello World', { maxLength: 5 })).toBe('Hello');
      expect(sanitizeInput('Test', { maxLength: 10 })).toBe('Test');
    });

    it('should filter by allowed characters', () => {
      const alphanumeric = /[a-zA-Z0-9]/;
      expect(sanitizeInput('Hello123!@#', { allowedCharacters: alphanumeric })).toBe(
        'Hello123'
      );
    });

    it('should apply multiple sanitization options', () => {
      const result = sanitizeInput(
        '  <p>Hello World 123!@#</p>  ',
        {
          trim: true,
          removeHtml: true,
          maxLength: 10,
          allowedCharacters: /[a-zA-Z0-9\s]/,
        }
      );
      
      expect(result).toBe('Hello Worl');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user @example.com',
        'user@example',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should reject non-string values', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate valid phone numbers', () => {
      const validPhones = [
        '+254712345678',
        '0712345678',
        '+1 (555) 123-4567',
        '555-123-4567',
        '5551234567',
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        'abcd',
        '+254abc',
        '',
        '   ',
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(false);
      });
    });

    it('should reject phone numbers that are too short', () => {
      expect(validatePhone('123456789')).toBe(false); // 9 digits
    });

    it('should accept phone numbers with formatting', () => {
      expect(validatePhone('+1 (555) 123-4567')).toBe(true);
      expect(validatePhone('(555) 123-4567')).toBe(true);
    });

    it('should reject non-string values', () => {
      expect(validatePhone(null as any)).toBe(false);
      expect(validatePhone(undefined as any)).toBe(false);
      expect(validatePhone(123456789 as any)).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should validate valid URLs', () => {
      const validURLs = [
        'https://example.com',
        'http://example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://subdomain.example.com',
        'https://example.com:8080',
      ];

      validURLs.forEach(url => {
        expect(validateURL(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidURLs = [
        'not-a-url',
        'example.com', // missing protocol
        '',
        '   ',
      ];

      invalidURLs.forEach(url => {
        expect(validateURL(url)).toBe(false);
      });
    });

    it('should reject non-string values', () => {
      expect(validateURL(null as any)).toBe(false);
      expect(validateURL(undefined as any)).toBe(false);
      expect(validateURL(123 as any)).toBe(false);
    });
  });

  describe('validateRange', () => {
    it('should validate numbers within range', () => {
      expect(validateRange(5, 0, 10)).toBe(true);
      expect(validateRange(0, 0, 10)).toBe(true);
      expect(validateRange(10, 0, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateRange(-1, 0, 10)).toBe(false);
      expect(validateRange(11, 0, 10)).toBe(false);
    });

    it('should validate with only min', () => {
      expect(validateRange(5, 0)).toBe(true);
      expect(validateRange(-1, 0)).toBe(false);
    });

    it('should validate with only max', () => {
      expect(validateRange(5, undefined, 10)).toBe(true);
      expect(validateRange(11, undefined, 10)).toBe(false);
    });

    it('should validate any finite number when no bounds given', () => {
      expect(validateRange(5)).toBe(true);
      expect(validateRange(-100)).toBe(true);
      expect(validateRange(1000000)).toBe(true);
    });

    it('should reject NaN', () => {
      expect(validateRange(NaN, 0, 10)).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(validateRange(Infinity, 0, 10)).toBe(false);
      expect(validateRange(-Infinity, 0, 10)).toBe(false);
    });

    it('should reject non-number values', () => {
      expect(validateRange('5' as any, 0, 10)).toBe(false);
      expect(validateRange(null as any, 0, 10)).toBe(false);
      expect(validateRange(undefined as any, 0, 10)).toBe(false);
    });
  });

  describe('validateISODate', () => {
    it('should validate valid ISO 8601 date strings', () => {
      const validDates = [
        '2024-01-15',
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.123Z',
        '2024-01-15T10:30:00+05:30',
        '2024-01-15T10:30:00-08:00',
      ];

      validDates.forEach(date => {
        expect(validateISODate(date)).toBe(true);
      });
    });

    it('should reject invalid ISO date strings', () => {
      const invalidDates = [
        'invalid',
        '2024-13-01', // invalid month
        '2024-01-32', // invalid day
        '2024/01/15', // wrong separator
        '01-15-2024', // wrong format
        '',
      ];

      invalidDates.forEach(date => {
        expect(validateISODate(date)).toBe(false);
      });
    });

    it('should reject non-string values', () => {
      expect(validateISODate(null as any)).toBe(false);
      expect(validateISODate(undefined as any)).toBe(false);
      expect(validateISODate(123 as any)).toBe(false);
    });
  });
});
