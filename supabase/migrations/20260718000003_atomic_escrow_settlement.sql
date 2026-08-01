-- ============================================================================
-- KULIMA — Atomic group-wallet credit, for escrow settlement
-- The July wallet-race fix added claim_wallet_debit/credit_wallet for the
-- `wallets` table, but src/lib/orders/escrow.ts (seller payout, buyer
-- refund, platform-fee credit, group payouts) never got switched onto them
-- — every write there was still read-balance -> compute -> write-balance,
-- so two orders settling close together for the same farmer (or the
-- platform's own commission wallet, hit on every single release) could
-- silently drop a payout. This migration adds the one missing piece
-- (pooled group-wallet credit lives on farmer_groups, not wallets, so it
-- needs its own atomic function); escrow.ts is updated to call
-- credit_wallet/credit_group_wallet everywhere instead of computing a new
-- balance in application code.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION credit_group_wallet(p_group_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE farmer_groups
  SET wallet_balance = wallet_balance + p_amount, wallet_updated_at = NOW()
  WHERE id = p_group_id;
END; $$;

REVOKE ALL ON FUNCTION credit_group_wallet(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_group_wallet(UUID, NUMERIC) TO service_role;
