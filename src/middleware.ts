import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js Middleware — runs before every request
 * Refreshes the Supabase session and guards protected routes
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/logout (handled by route.ts directly)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/logout).*)',
  ],
};
