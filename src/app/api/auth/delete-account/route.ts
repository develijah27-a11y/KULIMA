import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/system-log';

// PII columns on profiles to scrub when a hard delete isn't possible.
// Deliberately excludes id/user_id (FK integrity), role/roles, and the
// score/count columns — those aren't personal data and other parties'
// order/dispute/rating history still needs a row to resolve against.
const PROFILE_PII_COLUMNS = {
  full_name: 'Deleted user',
  phone_number: null,
  location: null,
  latitude: null,
  longitude: null,
  bio: null,
  avatar_url: null,
  business_name: null,
  district: null,
};

async function handlePOST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceRoleClient();

  // Try a real hard delete first — this is the common case (an account
  // with no orders/deliveries/disputes/ratings yet) and actually removes
  // everything. Only falls back below if it can't: numerous FK constraints
  // (orders, escrow_accounts, delivery_requests, disputes, ratings,
  // fraud_flags, listings.approved_by, verifications.reviewed_by, ...) on
  // auth.users are ON DELETE NO ACTION with no cascade trigger, so any
  // account with real activity makes deleteUser() throw — previously this
  // just failed with a generic "try again" that could never succeed.
  const { error: hardDeleteError } = await service.auth.admin.deleteUser(user.id);

  if (hardDeleteError) {
    // Fall back to Supabase's own soft-delete: anonymizes the auth.users
    // row's credentials and blocks sign-in without removing the row, so it
    // can never hit the same FK constraints (nothing referencing it stops
    // resolving). Combined with scrubbing our own profiles PII below, this
    // is the standard "can't hard-delete without breaking financial/dispute
    // history" pattern rather than a workaround — the account is genuinely
    // deactivated and depersonalized, which is what App/Play Store account-
    // deletion requirements actually call for when full erasure would
    // destroy other users' legitimate transaction records.
    const { error: softDeleteError } = await service.auth.admin.deleteUser(user.id, true);
    if (softDeleteError) {
      console.error('[/api/auth/delete-account] hard delete failed:', hardDeleteError);
      console.error('[/api/auth/delete-account] soft delete also failed:', softDeleteError);
      return NextResponse.json({ error: 'Failed to delete your account. Please try again.' }, { status: 500 });
    }

    const { error: scrubError } = await (service.from as any)('profiles')
      .update({ ...PROFILE_PII_COLUMNS, is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (scrubError) {
      console.error('[/api/auth/delete-account] PII scrub failed:', scrubError);
    }
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
