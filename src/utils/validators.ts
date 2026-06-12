/**
 * Common Validators Utility
 * 
 * Provides reusable validation functions for common data types
 * including UUIDs, date ranges, and input sanitization.
 * 
 * Requirements: 12.6
 */

/**
 * UUID v4 regex pattern
 */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID v4
 * 
 * @param value - String to validate
 * @returns True if valid UUID v4
 * 
 * @example
 * ```typescript
 * validateUUID('123e4567-e89b-12d3-a456-426614174000'); // true
 * validateUUID('invalid-uuid'); // false
 * ```
 */
export function validateUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return UUID_V4_PATTERN.test(value);
}

/**
 * Validate if a value is a valid UUID and throw if not
 * 
 * @param value - String to validate
 * @param fieldName - Name of the field for error message
 * @throws Error if invalid UUID
 * 
 * @example
 * ```typescript
 * assertUUID(farmId, 'farmId'); // throws if invalid
 * ```
 */
export function assertUUID(value: string, fieldName: string = 'ID'): void {
  if (!validateUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
}

/**
 * Date range validation result
 */
export interface DateRangeValidation {
  isValid: boolean;
  error?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Validate a date range
 * 
 * @param startDate - Start date (ISO string or Date)
 * @param endDate - End date (ISO string or Date)
 * @param options - Validation options
 * @returns Validation result with parsed dates
 * 
 * @example
 * ```typescript
 * const result = validateDateRange('2024-01-01', '2024-12-31');
 * if (result.isValid) {
 *   const { startDate, endDate } = result;
 *   // Use validated dates
 * }
 * ```
 */
export function validateDateRange(
  startDate?: string | Date,
  endDate?: string | Date,
  options: {
    required?: boolean;
    allowFuture?: boolean;
    maxRangeDays?: number;
  } = {}
): DateRangeValidation {
  const { required = false, allowFuture = true, maxRangeDays } = options;

  // If not required and both are missing, return valid
  if (!required && !startDate && !endDate) {
    return { isValid: true };
  }

  // If required and either is missing, return invalid
  if (required && (!startDate || !endDate)) {
    return {
      isValid: false,
      error: 'Both start date and end date are required',
    };
  }

  // Parse dates
  let parsedStart: Date | undefined;
  let parsedEnd: Date | undefined;

  try {
    if (startDate) {
      parsedStart =
        startDate instanceof Date ? startDate : new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        return {
          isValid: false,
          error: 'Start date is not a valid date',
        };
      }
    }

    if (endDate) {
      parsedEnd = endDate instanceof Date ? endDate : new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        return {
          isValid: false,
          error: 'End date is not a valid date',
        };
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid date format',
    };
  }

  // Check if future dates are allowed
  if (!allowFuture) {
    const now = new Date();
    if (parsedStart && parsedStart > now) {
      return {
        isValid: false,
        error: 'Start date cannot be in the future',
      };
    }
    if (parsedEnd && parsedEnd > now) {
      return {
        isValid: false,
        error: 'End date cannot be in the future',
      };
    }
  }

  // Check if end date is after start date
  if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
    return {
      isValid: false,
      error: 'End date must be equal to or after start date',
    };
  }

  // Check maximum range if specified
  if (maxRangeDays && parsedStart && parsedEnd) {
    const diffMs = parsedEnd.getTime() - parsedStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > maxRangeDays) {
      return {
        isValid: false,
        error: `Date range cannot exceed ${maxRangeDays} days`,
      };
    }
  }

  return {
    isValid: true,
    startDate: parsedStart,
    endDate: parsedEnd,
  };
}

/**
 * Sanitize user input by removing dangerous characters and trimming
 * 
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 * 
 * @example
 * ```typescript
 * const clean = sanitizeInput('  Hello <script>alert("xss")</script>  ');
 * // Returns: 'Hello alert("xss")'
 * ```
 */
export function sanitizeInput(
  input: string,
  options: {
    trim?: boolean;
    removeHtml?: boolean;
    maxLength?: number;
    allowedCharacters?: RegExp;
  } = {}
): string {
  const {
    trim = true,
    removeHtml = true,
    maxLength,
    allowedCharacters,
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Remove HTML tags
  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Apply allowed characters filter
  if (allowedCharacters) {
    sanitized = sanitized
      .split('')
      .filter(char => allowedCharacters.test(char))
      .join('');
  }

  // Truncate to max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate email format
 * 
 * @param email - Email to validate
 * @returns True if valid email format
 * 
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid'); // false
 * ```
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validate phone number format (basic validation)
 * 
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 * 
 * @example
 * ```typescript
 * validatePhone('+254712345678'); // true
 * validatePhone('07123456'); // false (too short)
 * ```
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it contains only digits and optional + prefix
  const phonePattern = /^\+?[0-9]{10,20}$/;
  return phonePattern.test(cleaned);
}

/**
 * Validate URL format
 * 
 * @param url - URL to validate
 * @returns True if valid URL format
 * 
 * @example
 * ```typescript
 * validateURL('https://example.com'); // true
 * validateURL('not-a-url'); // false
 * ```
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate numeric range
 * 
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range
 * 
 * @example
 * ```typescript
 * validateRange(5, 0, 10); // true
 * validateRange(15, 0, 10); // false
 * ```
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Validate ISO 8601 date string
 * 
 * @param dateString - Date string to validate
 * @returns True if valid ISO 8601 date
 * 
 * @example
 * ```typescript
 * validateISODate('2024-01-15T10:30:00Z'); // true
 * validateISODate('2024-01-15'); // true
 * validateISODate('invalid'); // false
 * ```
 */
export function validateISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const isoPattern =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

  if (!isoPattern.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
