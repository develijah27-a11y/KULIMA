/**
 * GET/POST /api/weather-logs
 * Requirements: 17.1, 17.2, 17.4, 17.5, 17.7, 23.2, 23.3, 23.4, 23.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWeatherLogSchema, getWeatherLogsQuerySchema } from '@/features/weather/validation/weather.schema';
import { createWeatherLog, getWeatherLogsByFarm } from '@/features/weather/services/weather.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';
import { buildPaginatedResponse } from '@/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      farmId: searchParams.get('farmId'),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validation = getWeatherLogsQuerySchema.safeParse(queryData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid query parameters' } },
        { status: 400 }
      );
    }

    const { farmId, startDate, endDate, page, limit } = validation.data;
    const { logs, total } = await getWeatherLogsByFarm(farmId, user.id, startDate, endDate, page, limit);

    return NextResponse.json({
      success: true,
      data: buildPaginatedResponse(logs, page, limit, total),
    });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const body = await request.json();
    const validation = createWeatherLogSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });
      return NextResponse.json(
        { success: false, error: { message: 'Validation failed', fields: fieldErrors } },
        { status: 400 }
      );
    }

    const log = await createWeatherLog({ userId: user.id, ...validation.data });
    return NextResponse.json({ success: true, data: { log } }, { status: 201 });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
