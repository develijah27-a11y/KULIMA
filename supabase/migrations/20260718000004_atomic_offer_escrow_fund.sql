-- ============================================================================
-- KULIMA — Atomic escrow funding for the legacy offer-based path
-- claim_escrow_fund (2026-07-14) made the order-based escrow-fund path
-- atomic (row-locks the buyer's wallet, inserts escrow, debits, all in one
-- transaction). The legacy offer-based path in POST /api/wallet/escrow
-- (action=fund, offerId branch) was never migrated onto it — it still reads
-- the buyer's balance, computes a new balance in application code, and
-- writes it back, with only a unique index on escrow_accounts.offer_id as a
-- backstop. That closes double-funding the *same* offer, but not funding
-- two *different* offers concurrently — both requests can read the same
-- stale balance before either write lands, so one debit is silently lost.
-- This mirrors claim_escrow_fund exactly, keyed by offer_id instead of
-- order_id.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_escrow_fund_offer(
  p_offer_id UUID,
  p_buyer_user_id UUID,
  p_seller_user_id UUID,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_escrow_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_buyer_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer wallet not found';
  END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  BEGIN
    INSERT INTO escrow_accounts (offer_id, buyer_user_id, seller_user_id, amount, status)
    VALUES (p_offer_id, p_buyer_user_id, p_seller_user_id, p_amount, 'funded')
    RETURNING id INTO v_escrow_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Escrow already funded for this offer';
  END;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
  VALUES (v_wallet.id, p_buyer_user_id, 'escrow_lock', p_amount, 'completed', 'Escrow funded for offer');

  RETURN v_escrow_id;
END; $$;

REVOKE ALL ON FUNCTION claim_escrow_fund_offer(UUID, UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_escrow_fund_offer(UUID, UUID, UUID, NUMERIC) TO service_role;
