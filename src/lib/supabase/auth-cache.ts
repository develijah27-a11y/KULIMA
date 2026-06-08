import { cache } from 'react';
import { createClient } from './server';

// Cached per-request: Supabase client is created once and shared across layout + all page RSCs
export const getSupabase = cache(async () => {
  return createClient();
});

// Cached per-request: session read is a local cookie parse — zero network cost
// Middleware already validated the JWT, so we can trust this session in pages
export const getAuthSession = cache(async () => {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
});
