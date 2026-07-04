import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out — Supabase SSR will clear the auth cookies via the setAll handler
    await supabase.auth.signOut();

    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });

    // Belt-and-suspenders: explicitly expire every sb-* cookie and the
    // agrinova_sess session-age stamp so the 12-hour clock resets on next login.
    const PROD = process.env.NODE_ENV === 'production';
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-') || name === 'agrinova_sess') {
        response.cookies.set(name, '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: PROD,
        });
      }
    });

    return response;
  } catch (error) {
    const { response, statusCode } = handleError(error, {
      endpoint: '/api/auth/logout',
      method: 'POST',
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
