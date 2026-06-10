import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Returns the profiles.id for a given auth user.
 * Auto-creates the profile row if it doesn't exist yet —
 * this handles the case where email-confirmation was enabled at sign-up
 * and the client-side upsert in AuthForm ran before the session was active.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient<any>,
  user: User,
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) return existing as { id: string };

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  const { data: created } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, full_name: fullName })
    .select('id')
    .single();

  return (created as { id: string } | null) ?? null;
}
