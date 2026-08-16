-- ============================================================================
-- KULIMA -- close a self-tampering hole on profiles' trust/verification/
-- subscription/status columns.
--
-- profiles' "Users can update own profile" UPDATE policy is only
-- `auth.uid() = user_id` with no WITH CHECK (Postgres reuses the USING
-- clause as the check when none is given -- see the 2026-07-14 and
-- 2026-07-27 migrations that fixed the exact same shape of bug for the
-- role/roles columns). That means it restricts which ROW can be updated,
-- not which COLUMNS or values -- and information_schema.column_privileges
-- confirms `authenticated` holds column-level UPDATE grants on every column
-- in the table, including ones that are meant to be entirely server/admin-
-- controlled:
--   verification_level, role_verification_levels -- the KYC trust badges
--     that gate real actions (e.g. /api/deliveries/[id]/accept requires
--     role_verification_levels.transporter to be 'blue'/'gold' before a
--     transporter can accept a paid delivery job)
--   trust_score, reliability_score, completed_deals, dispute_count -- shown
--     to buyers on listing pages as a trust signal before they escrow money
--   subscription_tier, role_subscription_tiers -- gates paid-tier features
--   phone_verified -- bypasses the phone OTP verification requirement
--   is_active -- an admin-controlled account-suspension flag
--
-- Any signed-in user can currently PATCH https://<project>.supabase.co/
-- rest/v1/profiles?user_id=eq.<own-id> directly (public anon key + their own
-- session JWT -- no need to touch this app's own frontend code at all) and
-- set any of these to whatever they like: fake a gold KYC badge without
-- ever uploading an ID, inflate trust_score to look safe to buyers, flip on
-- a premium subscription tier for free, or reactivate a suspended account.
--
-- Fix: extend the same trigger-based guard already used for role/roles to
-- also lock these columns to their previous value for non-service-role
-- callers. Verified every current legitimate writer of these columns
-- already uses the service-role client (verify/phone/confirm/route.ts,
-- subscriptions/route.ts) -- admin/verify-kyc/route.ts was the one
-- exception and is fixed in the same commit as this migration to also use
-- the service-role client, so this cannot break a real approval flow.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_self_admin_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
BEGIN
  IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  IF NEW.roles @> ARRAY['admin']::text[]
     AND NOT (COALESCE(OLD.roles, ARRAY[]::text[]) @> ARRAY['admin']::text[])
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  -- Trust/verification/subscription/status fields are server- or
  -- admin-controlled only — never client-settable, regardless of value.
  IF auth.role() <> 'service_role' THEN
    NEW.verification_level        := OLD.verification_level;
    NEW.role_verification_levels  := OLD.role_verification_levels;
    NEW.trust_score                := OLD.trust_score;
    NEW.reliability_score          := OLD.reliability_score;
    NEW.completed_deals            := OLD.completed_deals;
    NEW.dispute_count              := OLD.dispute_count;
    NEW.subscription_tier          := OLD.subscription_tier;
    NEW.role_subscription_tiers    := OLD.role_subscription_tiers;
    NEW.phone_verified             := OLD.phone_verified;
    NEW.is_active                  := OLD.is_active;
  END IF;

  RETURN NEW;
END; $$;
