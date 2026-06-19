import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Database } from '../database.types';
import { env } from '@/config/env';

export const createClient = cache(async () => {
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
          }
        },
      },
    }
  );
});

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
