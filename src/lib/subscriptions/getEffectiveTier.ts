import type { SubscriptionRole } from './plans';

interface ProfileForTier {
  subscription_tier?: string | null;
  role?: string | null;
  role_subscription_tiers?: Record<string, { plan: string; expiresAt: string | null }> | null;
}

/**
 * Resolves the plan id a role is actually entitled to right now — reads
 * role_subscription_tiers[role] first, falling back to the flat
 * subscription_tier column only when the profile's primary role matches
 * (same fallback semantics as role_verification_levels ->
 * verification_level). Expiry is checked here on every read rather than
 * needing a cron to flip an "expired" flag.
 */
export function getEffectiveTier(profile: ProfileForTier, role: SubscriptionRole): string {
  const entry = profile.role_subscription_tiers?.[role];
  if (entry) {
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return 'free';
    return entry.plan;
  }
  if (profile.role === role && profile.subscription_tier) {
    return profile.subscription_tier;
  }
  return 'free';
}
