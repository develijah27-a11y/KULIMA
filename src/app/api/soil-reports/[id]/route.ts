/**
 * GET /api/soil-reports/[id]
 * Requirements: 15.3, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSoilReportById } from '@/features/soil/services/soil.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const soilReport = await getSoilReportById(id, user.id);
    return NextResponse.json({ success: true, data: { soilReport } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
