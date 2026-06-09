import { cache } from 'react';
import { createClient } from './server';

// Cached per-request: Supabase client is created once and shared across layout + all page RSCs
export const getSupabase = cache(async () => {
  return createClient();
});

// Cached per-request: validates JWT against Supabase auth server (not just cookie parse)
export const getAuthSession = cache(async () => {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  // Return a session-like object so callers using session?.user still work
  return user ? { user } : null;
});
