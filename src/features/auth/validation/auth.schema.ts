/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating authentication-related API requests.
 * These schemas enforce runtime validation for signup and login operations.
 *
 * Requirements: 12.1, 24.6
 */

import { z } from 'zod';

const emailSchema = z
  .string({ message: 'Email is required' })
  .email('Invalid email format')
  .min(1, 'Email cannot be empty')
  .max(255, 'Email must be less than 255 characters');

const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

const fullNameSchema = z
  .string({ message: 'Full name is required' })
  .min(1, 'Full name cannot be empty')
  .max(100, 'Full name must be less than 100 characters')
  .trim();

const phoneNumberSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(20, 'Phone number must be less than 20 characters')
  .trim()
  .optional();

const locationSchema = z
  .string()
  .min(1, 'Location cannot be empty')
  .max(200, 'Location must be less than 200 characters')
  .trim()
  .optional();

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  phoneNumber: phoneNumberSchema,
  location: locationSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
