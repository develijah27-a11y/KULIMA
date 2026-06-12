/**
 * GET/POST /api/farms
 * Requirements: 14.1, 14.2, 14.6, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFarmSchema, farmQuerySchema } from '@/features/farms/validation/farm.schema';
import { createFarm, getFarmsByUser } from '@/features/farms/services/farm.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';
import { buildPaginatedResponse } from '@/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError();
    }

    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sortBy: (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'name',
      order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
    };

    const validation = farmQuerySchema.safeParse(queryData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid query parameters' } },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, order } = validation.data;
    const { farms, total } = await getFarmsByUser(user.id, page, limit, sortBy, order);

    return NextResponse.json({
      success: true,
      data: buildPaginatedResponse(farms, page, limit, total),
    });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError();
    }

    const body = await request.json();
    const validation = createFarmSchema.safeParse(body);

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

    const farm = await createFarm({ userId: user.id, ...validation.data });

    return NextResponse.json({ success: true, data: { farm } }, { status: 201 });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
