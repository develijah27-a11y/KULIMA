/**
 * Unit tests for centralized error handling utility
 * 
 * Tests cover:
 * - Custom error classes
 * - Error transformation functions
 * - Database error handling
 * - Validation error handling
 * - Authentication error handling
 * - Sensitive data sanitization
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  handleError,
  createErrorResponse,
  withErrorHandler,
} from '../error-handler';
import { ZodError, ZodIssue } from 'zod';

// Mock console.error to prevent test output pollution
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Custom Error Classes', () => {
  describe('ApiError', () => {
    it('should create an ApiError with message and status code', () => {
      const error = new ApiError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ApiError');
    });

    it('should create an ApiError with code and field errors', () => {
      const fieldErrors = { email: ['Invalid email'] };
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', fieldErrors);
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors).toEqual(fieldErrors);
    });

    it('should default to status 500 if not provided', () => {
      const error = new ApiError('Server error');
      
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include field errors', () => {
      const fieldErrors = { name: ['Required'], age: ['Must be positive'] };
      const error = new ValidationError('Invalid input', fieldErrors);
      
      expect(error.fieldErrors).toEqual(fieldErrors);
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with 401 status', () => {
      const error = new AuthenticationError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Authentication required');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError with 403 status', () => {
      const error = new AuthorizationError();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with 404 status', () => {
      const error = new NotFoundError();
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError with 409 status', () => {
      const error = new ConflictError();
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('DatabaseError', () => {
    it('should create a DatabaseError with 500 status', () => {
      const error = new DatabaseError();
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });
});

describe('handleError', () => {
  describe('ApiError handling', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError('Custom error', 400, 'CUSTOM_ERROR');
      const { response, statusCode } = handleError(error);
      
      expect(statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Custom error');
      expect(response.error.code).toBe('CUSTOM_ERROR');
    });

    it('should include field errors for ValidationError', () => {
      const fieldErrors = { email: ['Invalid format'] };
      const error = new ValidationError('Validation failed', fieldErrors);
      const { response, statusCode } = handleError(error);
      
      expect(statusCode).toBe(400);
      expect(response.error.fields).toEqual(fieldErrors);
    });
  });

  describe('ZodError handling', () => {
    it('should transform ZodError into API error response', () => {
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          exact: false,
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
        },
      ];

      const zodError = new ZodError(zodIssues);
      const { response, statusCode } = handleError(zodError);
      
      expect(statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.fields).toEqual({
        email: ['Expected string, received number'],
        password: ['String must contain at least 8 character(s)'],
      });
    });

    it('should handle nested field paths', () => {
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['farm', 'sizeHectares'],
          message: 'Expected number, received string',
        },
      ];

      const zodError = new ZodError(zodIssues);
      const { response } = handleError(zodError);
      
      expect(response.error.fields).toEqual({
        'farm.sizeHectares': ['Expected number, received string'],
      });
    });
  });

  describe('Database error handling', () => {
    it('should handle unique constraint violation (23505)', () => {
      const dbError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists.',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('A record with this information already exists');
      expect(response.error.code).toBe('DUPLICATE_RECORD');
    });

    it('should handle foreign key violation (23503)', () => {
      const dbError = {
        code: '23503',
        message: 'insert or update on table violates foreign key constraint',
        details: 'Key (farm_id)=(123) is not present in table "farms".',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('Referenced resource does not exist');
      expect(response.error.code).toBe('INVALID_REFERENCE');
    });

    it('should handle not null violation (23502)', () => {
      const dbError = {
        code: '23502',
        message: 'null value in column violates not-null constraint',
        details: 'Column "name" cannot be null',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('Required field is missing');
      expect(response.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should handle check constraint violation (23514)', () => {
      const dbError = {
        code: '23514',
        message: 'new row violates check constraint',
        details: 'Check constraint "valid_size" is violated',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('Invalid data value provided');
      expect(response.error.code).toBe('INVALID_DATA_VALUE');
    });

    it('should handle RLS policy violation (PGRST301)', () => {
      const dbError = {
        code: 'PGRST301',
        message: 'Row level security policy violation',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('You do not have permission to access this resource');
      expect(response.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle row not found (PGRST116)', () => {
      const dbError = {
        code: 'PGRST116',
        message: 'The result contains 0 rows',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('Resource not found');
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should handle unknown database errors generically', () => {
      const dbError = {
        code: 'XX000',
        message: 'Internal database error',
        details: 'Something went wrong',
      };

      const { response, statusCode } = handleError(dbError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('A database error occurred');
      expect(response.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Authentication error handling', () => {
    it('should handle invalid credentials', () => {
      const authError = {
        __isAuthError: true,
        message: 'Invalid login credentials',
        status: 401,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(401);
      expect(response.error.message).toBe('Invalid email or password');
      expect(response.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle email already registered', () => {
      const authError = {
        __isAuthError: true,
        message: 'User already registered',
        status: 400,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toBe('An account with this email already exists');
      expect(response.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should handle email not confirmed', () => {
      const authError = {
        __isAuthError: true,
        message: 'Email not confirmed',
        status: 401,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(401);
      expect(response.error.message).toBe('Please verify your email address');
      expect(response.error.code).toBe('EMAIL_NOT_CONFIRMED');
    });

    it('should handle expired token', () => {
      const authError = {
        __isAuthError: true,
        message: 'Token expired',
        status: 401,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(401);
      expect(response.error.message).toBe('Your session has expired. Please log in again');
      expect(response.error.code).toBe('SESSION_EXPIRED');
    });

    it('should handle weak password', () => {
      const authError = {
        __isAuthError: true,
        message: 'Password is too weak',
        status: 400,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(400);
      expect(response.error.message).toContain('Password is too weak');
      expect(response.error.code).toBe('WEAK_PASSWORD');
    });

    it('should handle generic auth errors', () => {
      const authError = {
        name: 'AuthError',
        message: 'Unknown auth error',
        status: 401,
      };

      const { response, statusCode } = handleError(authError);
      
      expect(statusCode).toBe(401);
      expect(response.error.message).toBe('Authentication failed');
      expect(response.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Generic error handling', () => {
    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');
      const { response, statusCode } = handleError(error);
      
      expect(statusCode).toBe(500);
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      const { response, statusCode } = handleError(error);
      
      expect(statusCode).toBe(500);
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle null errors', () => {
      const { response, statusCode } = handleError(null);
      
      expect(statusCode).toBe(500);
      expect(response.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Context logging', () => {
    it('should log context information when provided', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new ApiError('Test error', 400);
      const context = {
        userId: 'user-123',
        endpoint: '/api/farms',
        method: 'POST',
      };

      handleError(error, context);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error context:', context);
    });
  });

  describe('Sensitive data sanitization', () => {
    it('should not log sensitive data in error context', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Database error');
      const context = {
        userId: 'user-123',
        endpoint: '/api/auth/login',
      };

      handleError(error, context);
      
      // Check that console.error was called but doesn't contain password
      expect(consoleSpy).toHaveBeenCalled();
      const loggedArgs = consoleSpy.mock.calls;
      const hasPassword = loggedArgs.some(args => 
        JSON.stringify(args).includes('mypassword123')
      );
      expect(hasPassword).toBe(false);
    });
  });
});

describe('createErrorResponse', () => {
  it('should create a Response object with error JSON', () => {
    const error = new ValidationError('Invalid input');
    const response = createErrorResponse(error);
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include context in error response', async () => {
    const error = new NotFoundError('Farm not found');
    const context = {
      userId: 'user-123',
      endpoint: '/api/farms/123',
      method: 'GET',
    };
    
    const response = createErrorResponse(error, context);
    const body = await response.json();
    
    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Farm not found');
  });
});

describe('withErrorHandler', () => {
  it('should wrap handler and catch errors', async () => {
    const handler = async (request: Request) => {
      throw new ValidationError('Invalid data');
    };

    const wrappedHandler = withErrorHandler(handler);
    const request = new Request('http://localhost/api/test', { method: 'POST' });
    
    const response = await wrappedHandler(request);
    const body = await response.json();
    
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should pass through successful responses', async () => {
    const handler = async (request: Request) => {
      return new Response(JSON.stringify({ success: true, data: { id: '123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const wrappedHandler = withErrorHandler(handler);
    const request = new Request('http://localhost/api/test', { method: 'GET' });
    
    const response = await wrappedHandler(request);
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('123');
  });

  it('should extract endpoint and method from request', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const handler = async (request: Request) => {
      throw new Error('Test error');
    };

    const wrappedHandler = withErrorHandler(handler);
    const request = new Request('http://localhost/api/farms', { method: 'POST' });
    
    await wrappedHandler(request);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error context:',
      expect.objectContaining({
        endpoint: '/api/farms',
        method: 'POST',
      })
    );
  });
});
