/**
 * GET /api/disease-scans/[id]
 * Requirements: 16.3, 23.3, 23.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiseaseScanById } from '@/features/disease-detection/services/disease.service';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { handleError, AuthenticationError } from '@/utils/error-handler';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const diseaseScan = await getDiseaseScanById(params.id, user.id);
    return NextResponse.json({ success: true, data: { diseaseScan } });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
