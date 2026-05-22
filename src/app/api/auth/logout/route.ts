import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  const nextResponse = NextResponse.redirect(new URL('/auth/signin', _request.url));
  nextResponse.cookies.set('sb-access-token', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return nextResponse;
}