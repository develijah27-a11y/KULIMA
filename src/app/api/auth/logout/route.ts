/**
 * POST /api/auth/logout
 * User logout endpoint
 * Requirements: 10.6, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/features/auth/services/auth.service';
import { handleError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    await logout();

    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    const { response, statusCode } = handleError(error, {
      endpoint: '/api/auth/logout',
      method: 'POST',
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
