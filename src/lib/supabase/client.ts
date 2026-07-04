import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// Accept both the custom name and the standard Supabase dashboard name
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (typeof window !== 'undefined') {
  if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_project_url') {
    console.error('[AgriNova] NEXT_PUBLIC_SUPABASE_URL missing or still a placeholder in .env.local');
  } else if (!SUPABASE_ANON_KEY) {
    console.error('[AgriNova] Supabase anon key missing — add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  } else {
    // Log the project ref so you can confirm the right project is wired up
    try {
      const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
      console.info(`[AgriNova] Supabase → project: ${ref}`);
    } catch {
      console.error('[AgriNova] NEXT_PUBLIC_SUPABASE_URL is not a valid URL:', SUPABASE_URL);
    }
  }
}

export const createClient = () => {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
};
