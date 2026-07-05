-- Wallet-to-wallet transfers by account number. Runs as a single atomic
-- SQL function (both balance updates + both ledger rows in one transaction,
-- with row locks) so concurrent transfers can't race each other into an
-- inconsistent balance — the read-then-write pattern used by the
-- deposit/withdraw routes doesn't protect against that, so this is
-- intentionally stricter for a brand-new money-movement path.
--
-- The sender is always auth.uid(), never a caller-supplied parameter —
-- this runs SECURITY DEFINER (bypasses RLS), so if the sender were an
-- argument instead, any authenticated caller could drain any wallet by
-- passing someone else's user id.
CREATE OR REPLACE FUNCTION transfer_between_wallets(
  p_to_account_number TEXT,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  from_transaction_id UUID,
  to_transaction_id UUID,
  new_balance NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_user_id  UUID := auth.uid();
  v_from_wallet   wallets%ROWTYPE;
  v_to_wallet     wallets%ROWTYPE;
  v_from_txn_id   UUID;
  v_to_txn_id     UUID;
  v_from_name     TEXT;
  v_to_name       TEXT;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  -- Lock the sender's row first, then the recipient's — every transfer
  -- takes this same order (sender-then-recipient by definition, never
  -- reversed), so two transfers between the same pair can't deadlock.
  SELECT * INTO v_from_wallet FROM wallets WHERE user_id = v_from_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;

  SELECT * INTO v_to_wallet FROM wallets WHERE account_number = UPPER(TRIM(p_to_account_number)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No wallet found for account number %', p_to_account_number;
  END IF;

  IF v_from_wallet.id = v_to_wallet.id THEN
    RAISE EXCEPTION 'Cannot transfer to your own account';
  END IF;

  IF v_from_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_from_wallet.id;
  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_to_wallet.id;

  SELECT full_name INTO v_from_name FROM profiles WHERE user_id = v_from_user_id;
  SELECT full_name INTO v_to_name FROM profiles WHERE user_id = v_to_wallet.user_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, reference, description, metadata)
  VALUES (
    v_from_wallet.id, v_from_user_id, 'transfer_out', p_amount, 'completed',
    v_to_wallet.account_number,
    COALESCE(p_note, 'Transfer to ' || COALESCE(v_to_name, v_to_wallet.account_number)),
    jsonb_build_object('counterparty_account_number', v_to_wallet.account_number, 'counterparty_name', v_to_name, 'note', p_note)
  )
  RETURNING id INTO v_from_txn_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, reference, description, metadata)
  VALUES (
    v_to_wallet.id, v_to_wallet.user_id, 'transfer_in', p_amount, 'completed',
    v_from_wallet.account_number,
    COALESCE(p_note, 'Transfer from ' || COALESCE(v_from_name, v_from_wallet.account_number)),
    jsonb_build_object('counterparty_account_number', v_from_wallet.account_number, 'counterparty_name', v_from_name, 'note', p_note)
  )
  RETURNING id INTO v_to_txn_id;

  RETURN QUERY SELECT v_from_txn_id, v_to_txn_id, v_from_wallet.balance - p_amount;
END; $$;

REVOKE ALL ON FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) TO authenticated;
