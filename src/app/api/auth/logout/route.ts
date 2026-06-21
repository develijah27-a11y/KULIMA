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

    // Belt-and-suspenders: explicitly expire every sb-* cookie in the response
    // so the browser immediately discards them even if SSR setAll missed one.
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) {
        response.cookies.set(name, '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
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
