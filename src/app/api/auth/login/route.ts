/**
 * POST /api/auth/login
 * 
 * User authentication endpoint.
 * Authenticates user credentials and returns session.
 * 
 * Requirements: 10.2, 12.2, 12.4, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth/validation/auth.schema';
import { login } from '@/features/auth/services/auth.service';
import { handleError } from '@/utils/error-handler';
import type { ApiSuccessResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = loginSchema.safeParse(body);

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

    // Authenticate user
    const result = await login(validationResult.data);

    // Return success response
    const response: ApiSuccessResponse<{
      user: { id: string; email: string };
      session: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      };
    }> = {
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email!,
        },
        session: {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresAt: result.session.expires_at || 0,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle errors with centralized error handler
    const { response, statusCode } = handleError(error, {
      endpoint: '/api/auth/login',
      method: 'POST',
    });

    return NextResponse.json(response, { status: statusCode });
  }
}
