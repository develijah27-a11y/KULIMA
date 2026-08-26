/**
 * GET/POST /api/soil-reports
 * Requirements: 15.1, 15.2, 15.4, 15.5, 23.2, 23.3, 23.4, 23.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSoilReportSchema, getSoilReportsQuerySchema } from '@/features/soil/validation/soil.schema';
import { createSoilReport, getSoilReportsByFarm } from '@/features/soil/services/soil.service';
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
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validation = getSoilReportsQuerySchema.safeParse(queryData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid query parameters' } },
        { status: 400 }
      );
    }

    const { farmId, page, limit } = validation.data;
    const { reports, total } = await getSoilReportsByFarm(farmId, user.id, page, limit);

    return NextResponse.json({
      success: true,
      data: buildPaginatedResponse(reports, page, limit, total),
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
    const validation = createSoilReportSchema.safeParse(body);

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

    const report = await createSoilReport({ userId: user.id, ...validation.data });
    return NextResponse.json({ success: true, data: { report } }, { status: 201 });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
