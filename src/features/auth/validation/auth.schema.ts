/**
 * Authentication Validation Schemas
 * 
 * Zod schemas for validating authentication-related API requests.
 * These schemas enforce runtime validation for signup and login operations.
 * 
 * Requirements: 12.1, 24.6
 */

import { z } from 'zod';

/**
 * Email validation schema
 * - Must be a valid email format
 * - Required field
 */
const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  })
  .email('Invalid email format')
  .min(1, 'Email cannot be empty')
  .max(255, 'Email must be less than 255 characters');

/**
 * Password validation schema
 * - Minimum 8 characters for security
 * - Required field
 */
const passwordSchema = z
  .string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

/**
 * Full name validation schema
 * - Required field
 * - Must be between 1 and 100 characters
 */
const fullNameSchema = z
  .string({
    required_error: 'Full name is required',
    invalid_type_error: 'Full name must be a string',
  })
  .min(1, 'Full name cannot be empty')
  .max(100, 'Full name must be less than 100 characters')
  .trim();

/**
 * Phone number validation schema
 * - Optional field
 * - Must be between 10 and 20 characters when provided
 */
const phoneNumberSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(20, 'Phone number must be less than 20 characters')
  .trim()
  .optional();

/**
 * Location validation schema
 * - Optional field
 * - Must be between 1 and 200 characters when provided
 */
const locationSchema = z
  .string()
  .min(1, 'Location cannot be empty')
  .max(200, 'Location must be less than 200 characters')
  .trim()
  .optional();

/**
 * Signup validation schema
 * 
 * Validates user registration requests with the following fields:
 * - email: Valid email format (required)
 * - password: Minimum 8 characters (required)
 * - fullName: User's full name (required)
 * - phoneNumber: Phone number (optional)
 * - location: User's location (optional)
 * 
 * @example
 * ```typescript
 * const result = signupSchema.safeParse({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   fullName: 'John Doe',
 *   phoneNumber: '+1234567890',
 *   location: 'Nairobi, Kenya'
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  phoneNumber: phoneNumberSchema,
  location: locationSchema,
});

/**
 * Login validation schema
 * 
 * Validates user authentication requests with the following fields:
 * - email: Valid email format (required)
 * - password: Minimum 8 characters (required)
 * 
 * @example
 * ```typescript
 * const result = loginSchema.safeParse({
 *   email: 'user@example.com',
 *   password: 'SecurePass123'
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * TypeScript type inference from signup schema
 * Can be used in TypeScript code for type safety
 */
export type SignupInput = z.infer<typeof signupSchema>;

/**
 * TypeScript type inference from login schema
 * Can be used in TypeScript code for type safety
 */
export type LoginInput = z.infer<typeof loginSchema>;
