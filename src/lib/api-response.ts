import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiResponseError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

/**
 * Returns a standardized JSON success response envelope.
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponseSuccess<T>> {
  const body: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

/**
 * Returns a standardized JSON error response envelope.
 */
export function apiError(
  message: string,
  status = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiResponseError> {
  const body: ApiResponseError = {
    success: false,
    error: {
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

/**
 * Validates request JSON body against a Zod schema.
 * Returns { success: true, data } or { success: false, response: NextResponse }.
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse<ApiResponseError> }> {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return {
        success: false,
        response: apiError('Request body must be valid JSON', 400, 'INVALID_JSON'),
      };
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issueMessage = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return {
        success: false,
        response: apiError(`Validation failed: ${issueMessage}`, 422, 'VALIDATION_ERROR', parsed.error.issues),
      };
    }

    return {
      success: true,
      data: parsed.data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse request body';
    return {
      success: false,
      response: apiError(message, 400, 'BODY_PARSE_ERROR'),
    };
  }
}
