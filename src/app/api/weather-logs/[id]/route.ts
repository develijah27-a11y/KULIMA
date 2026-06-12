/**
 * GET /api/weather-logs/[id]
 * Requirements: 17.3, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWeatherLogById } from '@/features/weather/services/weather.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const weatherLog = await getWeatherLogById(params.id, user.id);
    return NextResponse.json({ success: true, data: { weatherLog } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
