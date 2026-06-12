# Utilities

This directory contains shared utility functions used throughout the application.

## Error Handler (`error-handler.ts`)

A centralized error handling system that transforms errors into consistent API response formats.

### Features

- **Type-safe error classes**: Custom error classes for common scenarios (validation, authentication, authorization, etc.)
- **Automatic error transformation**: Converts database errors, validation errors, and auth errors into user-friendly messages
- **Sensitive data protection**: Automatically redacts passwords, tokens, and API keys from logs
- **Consistent API responses**: All errors follow the same `ApiErrorResponse` format
- **Request context logging**: Includes user ID, endpoint, and method in error logs

### Usage

#### 1. Using Custom Error Classes

```typescript
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} from '@/utils/error-handler';

// Throw specific errors in your code
if (!farm) {
  throw new NotFoundError('Farm not found');
}

if (!userId) {
  throw new AuthenticationError('Authentication required');
}

// Validation errors with field-level details
const fieldErrors = {
  email: ['Email is required', 'Email must be valid'],
  password: ['Password must be at least 8 characters'],
};
throw new ValidationError('Invalid input', fieldErrors);
```

#### 2. Using `handleError` Function

```typescript
import { handleError } from '@/utils/error-handler';

try {
  // Your code here
  await farmService.createFarm(data);
} catch (error) {
  const { response, statusCode } = handleError(error, {
    userId: session.user.id,
    endpoint: '/api/farms',
    method: 'POST',
  });
  
  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 3. Using `createErrorResponse` (Recommended for Next.js API Routes)

```typescript
import { createErrorResponse } from '@/utils/error-handler';

export async function POST(request: Request) {
  try {
    // Your API logic here
    const data = await request.json();
    const result = await farmService.createFarm(data);
    
    return Response.json({ success: true, data: result });
  } catch (error) {
    // Automatically handles error transformation and response creation
    return createErrorResponse(error, {
      userId: session?.user.id,
      endpoint: '/api/farms',
      method: 'POST',
    });
  }
}
```

#### 4. Using `withErrorHandler` Wrapper (Cleanest Approach)

```typescript
import { withErrorHandler, NotFoundError } from '@/utils/error-handler';

// Wrap your handler with automatic error handling
export const GET = withErrorHandler(async (request: Request, { params }) => {
  const { id } = params;
  
  const farm = await farmService.getFarmById(id);
  
  if (!farm) {
    throw new NotFoundError('Farm not found');
  }
  
  return Response.json({
    success: true,
    data: { farm },
  });
});

// The wrapper automatically catches errors and transforms them
```

### Error Types Handled

The error handler automatically recognizes and transforms:

#### Database Errors
- `23505`: Unique constraint violation → "A record with this information already exists"
- `23503`: Foreign key violation → "Referenced resource does not exist"
- `23502`: Not null violation → "Required field is missing"
- `23514`: Check constraint violation → "Invalid data value provided"
- `PGRST116`: Row not found → "Resource not found"
- `PGRST301`: RLS policy violation → "You do not have permission to access this resource"

#### Authentication Errors
- Invalid credentials → "Invalid email or password"
- Email already registered → "An account with this email already exists"
- Email not confirmed → "Please verify your email address"
- Token expired → "Your session has expired. Please log in again"
- Weak password → "Password is too weak..."

#### Validation Errors (Zod)
- Automatically extracts field-level errors
- Returns structured field error messages

### Response Format

All errors follow this consistent structure:

```typescript
{
  success: false,
  error: {
    message: "User-friendly error message",
    code: "ERROR_CODE",
    fields?: {
      fieldName: ["Error message 1", "Error message 2"]
    }
  }
}
```

### Security Features

The error handler automatically:
- Redacts sensitive data from logs (passwords, tokens, API keys)
- Prevents internal error details from being exposed to clients
- Logs detailed error information server-side for debugging
- Sanitizes stack traces and database details

### Testing

Comprehensive unit tests are available in `__tests__/error-handler.test.ts`.

Run tests with:
```bash
npm test src/utils/__tests__/error-handler.test.ts
```

### Best Practices

1. **Always use the error handler**: Don't manually construct error responses
2. **Use specific error classes**: Use `NotFoundError`, `ValidationError`, etc. instead of generic `ApiError`
3. **Provide context**: Always pass user ID and endpoint when handling errors
4. **Don't catch and swallow**: Let errors bubble up to the error handler
5. **Use `withErrorHandler`**: Wrap API route handlers for automatic error handling

### Example: Complete API Route

```typescript
import { withErrorHandler, NotFoundError, ValidationError } from '@/utils/error-handler';
import { createFarmSchema } from '@/features/farms/validation/farm.schema';

export const POST = withErrorHandler(async (request: Request) => {
  // Get user session
  const session = await getSession();
  
  if (!session) {
    throw new AuthenticationError();
  }
  
  // Parse and validate request body
  const body = await request.json();
  const validationResult = createFarmSchema.safeParse(body);
  
  if (!validationResult.success) {
    throw validationResult.error; // ZodError - automatically handled
  }
  
  // Call service layer
  const farm = await farmService.createFarm({
    ...validationResult.data,
    userId: session.user.id,
  });
  
  // Return success response
  return Response.json({
    success: true,
    data: { farm },
  }, { status: 201 });
});
```

This approach ensures:
- Consistent error handling across all endpoints
- User-friendly error messages
- Secure logging without sensitive data
- Type-safe error responses

---

## Validators (`validators.ts`)

A collection of reusable validation functions for common data types including UUIDs, date ranges, emails, phone numbers, URLs, and input sanitization.

### Features

- **UUID v4 Validation**: Strict validation for UUID version 4 format
- **Date Range Validation**: Flexible date range validation with multiple options
- **Input Sanitization**: Remove dangerous characters, HTML tags, and enforce length limits
- **Email/Phone/URL Validation**: Common format validators
- **Range Validation**: Numeric range checking with min/max bounds
- **ISO Date Validation**: ISO 8601 date string validation

### Usage

#### 1. UUID Validation

```typescript
import { validateUUID, assertUUID } from '@/utils/validators';

// Validate UUID format
if (!validateUUID(farmId)) {
  throw new Error('Invalid farm ID');
}

// Assert UUID (throws if invalid)
assertUUID(farmId, 'farmId'); // throws "farmId must be a valid UUID"
```

#### 2. Date Range Validation

```typescript
import { validateDateRange } from '@/utils/validators';

// Basic validation
const result = validateDateRange('2024-01-01', '2024-12-31');
if (result.isValid) {
  const { startDate, endDate } = result;
  // Use validated Date objects
}

// With options
const result = validateDateRange(startDateStr, endDateStr, {
  required: true,           // Both dates must be provided
  allowFuture: false,       // Dates cannot be in the future
  maxRangeDays: 90,        // Maximum 90 days between dates
});

if (!result.isValid) {
  console.error(result.error); // Descriptive error message
}
```

#### 3. Input Sanitization

```typescript
import { sanitizeInput } from '@/utils/validators';

// Basic sanitization (trim + remove HTML)
const clean = sanitizeInput('  <p>Hello</p>  ');
// Returns: "Hello"

// With options
const clean = sanitizeInput(userInput, {
  trim: true,                           // Remove leading/trailing whitespace
  removeHtml: true,                     // Remove HTML tags
  maxLength: 100,                       // Truncate to 100 characters
  allowedCharacters: /[a-zA-Z0-9\s]/,  // Only alphanumeric + spaces
});
```

#### 4. Email, Phone, and URL Validation

```typescript
import { validateEmail, validatePhone, validateURL } from '@/utils/validators';

// Email validation
if (!validateEmail(email)) {
  throw new ValidationError('Invalid email format');
}

// Phone validation (supports +, spaces, dashes, parentheses)
if (!validatePhone(phone)) {
  throw new ValidationError('Invalid phone number');
}

// URL validation
if (!validateURL(imageUrl)) {
  throw new ValidationError('Invalid URL format');
}
```

#### 5. Numeric Range Validation

```typescript
import { validateRange } from '@/utils/validators';

// pH level validation (0-14)
if (!validateRange(phLevel, 0, 14)) {
  throw new ValidationError('pH must be between 0 and 14');
}

// Minimum only
if (!validateRange(age, 18)) {
  throw new ValidationError('Must be at least 18');
}

// Maximum only
if (!validateRange(discount, undefined, 100)) {
  throw new ValidationError('Discount cannot exceed 100%');
}
```

#### 6. ISO Date Validation

```typescript
import { validateISODate } from '@/utils/validators';

if (!validateISODate(recordedAt)) {
  throw new ValidationError('Date must be in ISO 8601 format');
}
```

### Complete Example: Using Validators in API Route

```typescript
import { withErrorHandler, ValidationError } from '@/utils/error-handler';
import { validateUUID, validateDateRange, sanitizeInput } from '@/utils/validators';

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  
  // Validate UUID
  const farmId = searchParams.get('farmId');
  if (!farmId || !validateUUID(farmId)) {
    throw new ValidationError('Invalid farm ID');
  }
  
  // Validate date range
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  const dateValidation = validateDateRange(startDate || undefined, endDate || undefined, {
    allowFuture: false,
    maxRangeDays: 365,
  });
  
  if (!dateValidation.isValid) {
    throw new ValidationError(dateValidation.error!);
  }
  
  // Sanitize search query
  const search = sanitizeInput(searchParams.get('search') || '', {
    maxLength: 100,
    allowedCharacters: /[a-zA-Z0-9\s]/,
  });
  
  // Fetch data with validated parameters
  const logs = await weatherService.getWeatherLogs({
    farmId,
    startDate: dateValidation.startDate,
    endDate: dateValidation.endDate,
    search,
  });
  
  return Response.json({
    success: true,
    data: { logs },
  });
});
```

### Validator Functions Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `validateUUID(value)` | Check if string is valid UUID v4 | `boolean` |
| `assertUUID(value, fieldName?)` | Throw error if not valid UUID | `void` (throws on error) |
| `validateDateRange(start, end, options?)` | Validate date range with options | `DateRangeValidation` object |
| `sanitizeInput(input, options?)` | Clean and sanitize user input | `string` |
| `validateEmail(email)` | Check email format | `boolean` |
| `validatePhone(phone)` | Check phone number format | `boolean` |
| `validateURL(url)` | Check URL format (https/http) | `boolean` |
| `validateRange(value, min?, max?)` | Check if number is within range | `boolean` |
| `validateISODate(dateString)` | Check if valid ISO 8601 date | `boolean` |

### Testing

Comprehensive unit tests with 47 test cases covering all validators are available in `__tests__/validators.test.ts`.

Run tests with:
```bash
npm test src/utils/__tests__/validators.test.ts
```

### Best Practices

1. **Use validators at API boundaries**: Validate all user input in API routes before processing
2. **Combine with Zod schemas**: Use validators for complex validation that Zod doesn't cover easily
3. **Sanitize user input**: Always sanitize strings that will be displayed or stored
4. **Provide context in errors**: Use descriptive field names when throwing validation errors
5. **Validate UUIDs early**: Check UUIDs before database queries to prevent errors

### Requirements

Implements **Requirement 12.6**: Common validators for UUID validation, date range filtering, and input sanitization.

---
