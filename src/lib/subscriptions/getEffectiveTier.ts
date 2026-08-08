import type { SubscriptionRole } from './plans';

interface ProfileForTier {
  subscription_tier?: string | null;
  role?: string | null;
  /** All roles the account currently holds — needed to tell a genuinely
   *  single-role legacy account from a multi-role one (see fallback note
   *  below). */
  roles?: string[] | null;
  role_subscription_tiers?: Record<string, { plan: string; expiresAt: string | null }> | null;
}

/**
 * Resolves the plan id a role is actually entitled to right now — reads
 * role_subscription_tiers[role] first, falling back to the flat
 * subscription_tier column only when the profile's primary role matches
 * (same fallback semantics as role_verification_levels ->
 * verification_level). Expiry is checked here on every read rather than
 * needing a cron to flip an "expired" flag.
 *
 * The flat subscription_tier column predates multi-role accounts and was
 * only ever scoped to whichever role was `profile.role` *at the time it was
 * set*. `profile.role` is mutable after the fact (re-onboarding via
 * /api/onboarding/set-role rewrites it, and it no longer changes when a
 * role is merely added via /api/profile/add-role) — so on a multi-role
 * account a stale flat tier bought under an earlier primary role can end up
 * matching a *different, currently-active* role purely because
 * profile.role was reassigned later. That showed up as e.g. a transporter's
 * premium page reporting them "already on the Farmer Pro plan" because an
 * old farmer-era subscription_tier bled across into the transporter role.
 * Restrict the fallback to accounts that have only ever held this one role,
 * where that ambiguity can't exist.
 */
export function getEffectiveTier(profile: ProfileForTier, role: SubscriptionRole): string {
  const entry = profile.role_subscription_tiers?.[role];
  if (entry) {
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return 'free';
    return entry.plan;
  }
  const isSingleRoleAccount = !profile.roles || profile.roles.length === 0 || (profile.roles.length === 1 && profile.roles[0] === role);
  if (profile.role === role && profile.subscription_tier && isSingleRoleAccount) {
    return profile.subscription_tier;
  }
  return 'free';
}
