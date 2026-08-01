-- ============================================================================
-- KULIMA — Per-role subscription tiers
-- profiles.subscription_tier / the `subscriptions` table (20260725000002) were
-- account-wide flat fields — a user active as both farmer and transporter
-- couldn't hold "Farmer Pro" and "Driver Pro" independently. Mirrors the
-- already-proven role_verification_levels JSONB pattern
-- (20260717000001_role_scoped_verification.sql): additive-merge JSONB keyed
-- by role, falling back to the flat column for anything approved before this
-- migration existed.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role_subscription_tiers JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS billed_by TEXT NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS billed_by_group_id UUID REFERENCES farmer_groups(id) ON DELETE SET NULL;

UPDATE subscriptions SET role = 'farmer' WHERE role IS NULL;
ALTER TABLE subscriptions ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billed_by_check') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billed_by_check
      CHECK (billed_by IN ('self','group'));
  END IF;
END $$;

-- Pricing/plan validity now lives in src/lib/subscriptions/plans.ts (a single
-- source of truth the app checks before ever writing a row) instead of a DB
-- CHECK constraint, so adding/repricing a plan never needs a migration.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Group Pro is billed to the group's own pooled wallet, not an individual —
-- 'subscription' joins the existing transaction-type vocabulary for
-- farmer_groups.wallet_balance movements.
ALTER TABLE group_wallet_transactions DROP CONSTRAINT IF EXISTS group_wallet_transactions_type_check;
ALTER TABLE group_wallet_transactions ADD CONSTRAINT group_wallet_transactions_type_check
  CHECK (type = ANY (ARRAY['sale_payout','sale_payout_split','contribution','withdrawal','fee','subscription']));

-- Same addition for personal-wallet subscription debits (wallets/wallet_transactions).
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY['deposit','withdrawal','escrow_lock','escrow_release','escrow_refund','fee','payout','transfer_in','transfer_out','subscription']));

-- Atomic conditional debit for farmer_groups.wallet_balance — a flat column,
-- not a `wallets` row, so claim_wallet_debit can't target it. Same
-- UPDATE...WHERE...RETURN FOUND shape as every other claim_* RPC in this
-- codebase.
CREATE OR REPLACE FUNCTION claim_group_wallet_debit(p_group_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE farmer_groups
  SET wallet_balance = wallet_balance - p_amount, wallet_updated_at = NOW()
  WHERE id = p_group_id AND wallet_balance >= p_amount;

  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION claim_group_wallet_debit(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_group_wallet_debit(UUID, NUMERIC) TO service_role;
