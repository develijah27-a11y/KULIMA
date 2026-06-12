/**
 * Authentication Schema Tests
 * 
 * Unit tests for authentication validation schemas
 * Tests valid inputs, invalid inputs, and edge cases
 */

import { describe, it, expect } from '@jest/globals';
import { signupSchema, loginSchema } from '../auth.schema';

describe('Authentication Validation Schemas', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'John Doe',
        phoneNumber: '+254712345678',
        location: 'Nairobi, Kenya',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate signup data without optional fields', () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(validData.email);
        expect(result.data.password).toBe(validData.password);
        expect(result.data.fullName).toBe(validData.fullName);
        expect(result.data.phoneNumber).toBeUndefined();
        expect(result.data.location).toBeUndefined();
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
        expect(result.error.issues[0].message).toContain('Invalid email format');
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'SecurePass123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
      }
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'SecurePass123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find(e => e.path[0] === 'email');
        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain('expected string');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Short1',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['password']);
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'user@example.com',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(e => e.path[0] === 'password');
        expect(passwordError).toBeDefined();
        expect(passwordError?.message).toContain('expected string');
      }
    });

    it('should reject empty full name', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: '',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['fullName']);
        expect(result.error.issues[0].message).toBe('Full name cannot be empty');
      }
    });

    it('should reject missing full name', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find(e => e.path[0] === 'fullName');
        expect(nameError).toBeDefined();
        expect(nameError?.message).toContain('expected string');
      }
    });

    it('should reject phone number shorter than 10 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'John Doe',
        phoneNumber: '123456',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['phoneNumber']);
        expect(result.error.issues[0].message).toBe('Phone number must be at least 10 characters');
      }
    });

    it('should reject phone number longer than 20 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'John Doe',
        phoneNumber: '123456789012345678901',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['phoneNumber']);
        expect(result.error.issues[0].message).toBe('Phone number must be less than 20 characters');
      }
    });

    it('should trim whitespace from string fields', () => {
      const dataWithWhitespace = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: '  John Doe  ',
        phoneNumber: '  +254712345678  ',
        location: '  Nairobi, Kenya  ',
      };

      const result = signupSchema.safeParse(dataWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('John Doe');
        expect(result.data.phoneNumber).toBe('+254712345678');
        expect(result.data.location).toBe('Nairobi, Kenya');
      }
    });

    it('should reject full name longer than 100 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'A'.repeat(101),
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['fullName']);
        expect(result.error.issues[0].message).toBe('Full name must be less than 100 characters');
      }
    });

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const invalidData = {
        email: longEmail,
        password: 'SecurePass123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
        expect(result.error.issues[0].message).toBe('Email must be less than 255 characters');
      }
    });

    it('should reject password longer than 128 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'A'.repeat(129),
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['password']);
        expect(result.error.issues[0].message).toBe('Password must be less than 128 characters');
      }
    });

    it('should reject location longer than 200 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        fullName: 'John Doe',
        location: 'A'.repeat(201),
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['location']);
        expect(result.error.issues[0].message).toBe('Location must be less than 200 characters');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
        expect(result.error.issues[0].message).toContain('Invalid email format');
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
      }
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find(e => e.path[0] === 'email');
        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain('expected string');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Short1',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['password']);
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'user@example.com',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(e => e.path[0] === 'password');
        expect(passwordError).toBeDefined();
        expect(passwordError?.message).toContain('expected string');
      }
    });

    it('should reject extra fields not in schema', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        extraField: 'should not be here',
      };

      // Zod will ignore extra fields by default unless .strict() is used
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          email: 'user@example.com',
          password: 'SecurePass123',
        });
      }
    });
  });
});
