/**
 * Centralized Error Handling Utility
 * 
 * This module provides a centralized error handling system that:
 * - Transforms errors into consistent API response formats
 * - Handles database errors, validation errors, and authentication errors
 * - Returns user-friendly error messages
 * - Prevents sensitive information from appearing in error responses
 * - Logs detailed error information for debugging
 * 
 * References: Requirements R13.1, R13.2, R13.3, R13.6
 */

import { ApiErrorResponse, ApiErrorDetails } from '@/types/api';
import { ZodError } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Custom API error class with status code and optional field errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    fieldErrors?: Record<string, string[]>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR', fieldErrors);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error for duplicate resources
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// Sensitive Data Patterns
// ============================================================================

/**
 * Patterns for sensitive data that should be redacted from logs and responses
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
  /auth/i,
  /bearer/i,
  /credential/i,
];

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ============================================================================
// Error Type Handlers
// ============================================================================

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): ApiErrorResponse {
  const fieldErrors: Record<string, string[]> = {};

  // Get issues from ZodError
  const issues = error.issues || error.errors || [];
  
  issues.forEach((err) => {
    const path = err.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(err.message);
  });

  return {
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: fieldErrors,
    },
  };
}

/**
 * Handle PostgreSQL/Supabase database errors
 */
function handleDatabaseError(error: PostgrestError | any): ApiErrorResponse {
  // Log the full error for debugging (sanitized)
  console.error('Database error:', sanitizeObject({
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  }));

  // Common PostgreSQL error codes
  const errorCode = error.code || error.error_code;

  switch (errorCode) {
    case '23505': // unique_violation
      return {
        success: false,
        error: {
          message: 'A record with this information already exists',
          code: 'DUPLICATE_RECORD',
        },
      };

    case '23503': // foreign_key_violation
      return {
        success: false,
        error: {
          message: 'Referenced resource does not exist',
          code: 'INVALID_REFERENCE',
        },
      };

    case '23502': // not_null_violation
      return {
        success: false,
        error: {
          message: 'Required field is missing',
          code: 'MISSING_REQUIRED_FIELD',
        },
      };

    case '23514': // check_violation
      return {
        success: false,
        error: {
          message: 'Invalid data value provided',
          code: 'INVALID_DATA_VALUE',
        },
      };

    case 'PGRST116': // Row not found
      return {
        success: false,
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      };

    case 'PGRST301': // RLS policy violation
      return {
        success: false,
        error: {
          message: 'You do not have permission to access this resource',
          code: 'AUTHORIZATION_ERROR',
        },
      };

    default:
      // Generic database error - don't expose internal details
      return {
        success: false,
        error: {
          message: 'A database error occurred',
          code: 'DATABASE_ERROR',
        },
      };
  }
}

/**
 * Handle Supabase Auth errors
 */
function handleAuthError(error: any): ApiErrorResponse {
  const message = error.message?.toLowerCase() || '';

  // Log sanitized error
  console.error('Auth error:', sanitizeObject({
    message: error.message,
    status: error.status,
  }));

  // Common auth error patterns
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return {
      success: false,
      error: {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      },
    };
  }

  if (message.includes('email already registered') || message.includes('user already registered')) {
    return {
      success: false,
      error: {
        message: 'An account with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS',
      },
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      success: false,
      error: {
        message: 'Please verify your email address',
        code: 'EMAIL_NOT_CONFIRMED',
      },
    };
  }

  if (message.includes('invalid token') || message.includes('token expired')) {
    return {
      success: false,
      error: {
        message: 'Your session has expired. Please log in again',
        code: 'SESSION_EXPIRED',
      },
    };
  }

  if (message.includes('password') && message.includes('weak')) {
    return {
      success: false,
      error: {
        message: 'Password is too weak. Use at least 8 characters with a mix of letters and numbers',
        code: 'WEAK_PASSWORD',
      },
    };
  }

  // Generic auth error
  return {
    success: false,
    error: {
      message: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
    },
  };
}

/**
 * Handle custom ApiError instances
 */
function handleApiError(error: ApiError): ApiErrorResponse {
  const errorDetails: ApiErrorDetails = {
    message: error.message,
    code: error.code,
  };

  if (error.fieldErrors) {
    errorDetails.fields = error.fieldErrors;
  }

  return {
    success: false,
    error: errorDetails,
  };
}

// ============================================================================
// Main Error Handler
// ============================================================================

/**
 * Transform any error into a consistent API error response
 * 
 * This function:
 * - Identifies the error type
 * - Transforms it into a user-friendly message
 * - Logs detailed error information (sanitized)
 * - Returns a consistent ApiErrorResponse
 * 
 * @param error - The error to handle
 * @param context - Optional context information for logging
 * @returns ApiErrorResponse with appropriate status code and message
 */
export function handleError(
  error: unknown,
  context?: {
    userId?: string;
    endpoint?: string;
    method?: string;
  }
): { response: ApiErrorResponse; statusCode: number } {
  // Log context if provided (sanitized)
  if (context) {
    console.error('Error context:', sanitizeObject(context));
  }

  // Handle known error types
  if (error instanceof ApiError) {
    return {
      response: handleApiError(error),
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ZodError) {
    return {
      response: handleZodError(error),
      statusCode: 400,
    };
  }

  // Check for Supabase/PostgreSQL errors
  if (error && typeof error === 'object') {
    const err = error as any;

    // Supabase Auth errors
    if (err.__isAuthError || err.name === 'AuthError' || err.status === 401 || err.status === 403) {
      return {
        response: handleAuthError(err),
        statusCode: err.status || 401,
      };
    }

    // PostgreSQL/Supabase database errors
    if (err.code || err.error_code || err.hint || err.details) {
      return {
        response: handleDatabaseError(err),
        statusCode: 400,
      };
    }
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    // Log the error (sanitized) but don't expose internal details
    console.error('Unhandled error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return {
      response: {
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
      statusCode: 500,
    };
  }

  // Unknown error type
  console.error('Unknown error type:', error);

  return {
    response: {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
    },
    statusCode: 500,
  };
}

/**
 * Create an error response with the appropriate status code
 * 
 * This is a convenience wrapper for Next.js API routes
 * 
 * @param error - The error to handle
 * @param context - Optional context information
 * @returns Object with Response object and status code
 */
export function createErrorResponse(
  error: unknown,
  context?: {
    userId?: string;
    endpoint?: string;
    method?: string;
  }
): Response {
  const { response, statusCode } = handleError(error, context);

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Async error handler wrapper for API route handlers
 * 
 * This wraps an API route handler and automatically catches and handles errors
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<Response>
): (request: Request, context?: any) => Promise<Response> {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return createErrorResponse(error, {
        endpoint: new URL(request.url).pathname,
        method: request.method,
      });
    }
  };
}
