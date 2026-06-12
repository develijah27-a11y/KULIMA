/**
 * POST /api/auth/signup
 * 
 * User registration endpoint.
 * Creates a new user account and associated profile.
 * 
 * Requirements: 10.1, 10.7, 12.2, 12.4, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/features/auth/validation/auth.schema';
import { signup } from '@/features/auth/services/auth.service';
import { handleError } from '@/utils/error-handler';
import type { ApiSuccessResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      // Return validation errors
      const fieldErrors: Record<string, string[]> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            fields: fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // Create user and profile
    const result = await signup(validationResult.data);

    // Return success response
    const response: ApiSuccessResponse<{
      user: { id: string; email: string };
      profile: {
        id: string;
        userId: string;
        fullName: string;
        phoneNumber: string | null;
        location: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }> = {
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email!,
        },
        profile: {
          id: result.profile.id,
          userId: result.profile.user_id,
          fullName: result.profile.full_name,
          phoneNumber: result.profile.phone_number,
          location: result.profile.location,
          createdAt: result.profile.created_at,
          updatedAt: result.profile.updated_at,
        },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Handle errors with centralized error handler
    const { response, statusCode } = handleError(error, {
      endpoint: '/api/auth/signup',
      method: 'POST',
    });

    return NextResponse.json(response, { status: statusCode });
  }
}
