import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Atomic, DB-backed fixed-window rate limit. Fails open (returns true) on an
 * infra error — a rate limiter that can 500 real users out of paying is worse
 * than one that occasionally under-limits during an outage.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data, error } = await (admin as any).rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('[rate-limit]', error);
    return true;
  }
  return data === true;
}
