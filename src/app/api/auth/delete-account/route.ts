import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/system-log';

async function handlePOST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Delete the auth user (cascades to profiles and related data via FK)
  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[/api/auth/delete-account]', error);
    return NextResponse.json({ error: 'Failed to delete your account. Please try again.' }, { status: 500 });
  }

  // Expire all Supabase session cookies
  const response = NextResponse.json({ ok: true });
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  });

  return response;
}

export const POST = withApiLogging('/api/auth/delete-account', handlePOST);
