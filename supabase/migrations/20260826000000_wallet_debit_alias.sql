-- ============================================================================
-- KULIMA — WALLET DEBIT RPC ALIAS & GRANTS
-- Creates debit_wallet as an alias to claim_wallet_debit to ensure full
-- interoperability with both function signatures.
-- ============================================================================

CREATE OR REPLACE FUNCTION debit_wallet(p_wallet_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = p_wallet_id AND balance >= p_amount;

  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION debit_wallet(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION debit_wallet(UUID, NUMERIC) TO service_role;
