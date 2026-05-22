import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';
import { env } from '@/config/env';

/**
 * Creates a Supabase client for client-side operations
 * Uses the publishable (anon) key which is safe for client-side use
 * 
 * @returns Supabase browser client with type-safe database schema
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
};
