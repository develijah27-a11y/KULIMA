import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database.types';
import { env } from '@/config/env';

/**
 * Creates a Supabase client for server-side operations
 * Uses the publishable key with cookie-based session management
 * For operations requiring RLS bypass, use createServiceRoleClient instead
 * 
 * @returns Supabase server client with type-safe database schema
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ??
    '';

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only context).
            // The middleware handles token refresh so this is safe to ignore.
          }
        },
      },
    }
  );
};

/**
 * Creates a Supabase client with service role key for server-side operations
 * WARNING: This client bypasses Row Level Security (RLS)
 * Only use when RLS bypass is necessary and safe (e.g., admin operations, system tasks)
 * NEVER expose this client or its key to client-side code
 * 
 * @returns Supabase server client with service role privileges
 */
export const createServiceRoleClient = () => {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
};
