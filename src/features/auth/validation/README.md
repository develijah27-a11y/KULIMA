# Authentication Validation Schemas

This directory contains Zod validation schemas for authentication-related API requests.

## Files

- **auth.schema.ts**: Zod schemas for signup and login validation
- **index.ts**: Exports for easy importing
- **__tests__/auth.schema.test.ts**: Comprehensive unit tests for the schemas

## Schemas

### signupSchema

Validates user registration requests with the following fields:

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| email | string | Yes | Valid email format, 1-255 characters |
| password | string | Yes | Minimum 8 characters, max 128 characters |
| fullName | string | Yes | 1-100 characters, trimmed |
| phoneNumber | string | No | 10-20 characters when provided, trimmed |
| location | string | No | 1-200 characters when provided, trimmed |

**Usage Example:**
```typescript
import { signupSchema } from '@/features/auth/validation';

const result = signupSchema.safeParse({
  email: 'user@example.com',
  password: 'SecurePass123',
  fullName: 'John Doe',
  phoneNumber: '+254712345678',
  location: 'Nairobi, Kenya'
});

if (result.success) {
  // Data is valid, use result.data
  console.log(result.data);
} else {
  // Validation failed, handle errors
  console.error(result.error.issues);
}
```

### loginSchema

Validates user authentication requests with the following fields:

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| email | string | Yes | Valid email format, 1-255 characters |
| password | string | Yes | Minimum 8 characters, max 128 characters |

**Usage Example:**
```typescript
import { loginSchema } from '@/features/auth/validation';

const result = loginSchema.safeParse({
  email: 'user@example.com',
  password: 'SecurePass123'
});

if (result.success) {
  // Credentials format is valid
  console.log(result.data);
} else {
  // Validation failed
  console.error(result.error.issues);
}
```

## Type Inference

TypeScript types can be inferred from the schemas:

```typescript
import { SignupInput, LoginInput } from '@/features/auth/validation';

// SignupInput type matches signupSchema
const signupData: SignupInput = {
  email: 'user@example.com',
  password: 'SecurePass123',
  fullName: 'John Doe',
  phoneNumber: '+254712345678', // optional
  location: 'Nairobi, Kenya'     // optional
};

// LoginInput type matches loginSchema
const loginData: LoginInput = {
  email: 'user@example.com',
  password: 'SecurePass123'
};
```

## Error Handling

When validation fails, Zod returns detailed error information:

```typescript
const result = signupSchema.safeParse({ email: 'invalid' });

if (!result.success) {
  result.error.issues.forEach(issue => {
    console.log(`Field: ${issue.path.join('.')}`);
    console.log(`Error: ${issue.message}`);
  });
}
```

## Testing

Run the test suite:

```bash
npm test -- --testPathPatterns=auth.schema
```

The test suite includes:
- Valid input validation
- Invalid email format rejection
- Password strength validation
- Required field validation
- Optional field handling
- String length validation
- Whitespace trimming
- Edge cases

## Requirements

This implementation satisfies:
- **Requirement 12.1**: Define Validation_Schema using Zod for all API endpoint request bodies
- **Requirement 24.6**: Validate string lengths, number ranges, email formats, and required fields using Zod

## Integration

These schemas should be used in:
1. API route handlers (`/src/app/api/auth/*`)
2. Frontend form validation
3. Service layer methods

Example API route usage:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/features/auth/validation';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate request body
  const result = signupSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          fields: result.error.issues
        }
      },
      { status: 400 }
    );
  }
  
  // Proceed with validated data
  const { email, password, fullName, phoneNumber, location } = result.data;
  // ... create user
}
```
