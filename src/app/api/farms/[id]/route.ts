/**
 * GET/PUT/DELETE /api/farms/[id]
 * Requirements: 14.3, 14.4, 14.5, 23.3, 23.4, 23.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateFarmSchema } from '@/features/farms/validation/farm.schema';
import { getFarmById, updateFarm, deleteFarm } from '@/features/farms/services/farm.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const farm = await getFarmById(id, user.id);
    return NextResponse.json({ success: true, data: { farm } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const body = await request.json();
    const validation = updateFarmSchema.safeParse(body);

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

    const farm = await updateFarm(id, user.id, validation.data);
    return NextResponse.json({ success: true, data: { farm } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    await deleteFarm(id, user.id);
    return NextResponse.json({ success: true, data: { message: 'Farm deleted successfully' } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
