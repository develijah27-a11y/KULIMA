import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database.types';
import { env } from '@/config/env';

export const createClient = async () => {
  let cookieStore: { getAll: () => { name: string; value: string }[]; set: (name: string, value: string, options?: any) => void };
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = {
      getAll: () => [],
      set: () => {},
    };
  }

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
};

export const createServiceRoleClient = () => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || (process.env.NEXT_PUBLIC_SUPABASE_URL as string);
  const key = env.SUPABASE_SERVICE_ROLE_KEY || (process.env.SUPABASE_SERVICE_ROLE_KEY as string) || '';
  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
};
