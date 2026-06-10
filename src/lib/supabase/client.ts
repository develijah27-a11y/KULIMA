import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// Accept both the custom name and the standard Supabase dashboard name
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (typeof window !== 'undefined' && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error(
    '[Kulima] Supabase env vars missing. Add NEXT_PUBLIC_SUPABASE_URL and ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) to .env.local'
  );
}

export const createClient = () => {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
};
