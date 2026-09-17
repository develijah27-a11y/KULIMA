-- ============================================================================
-- KULIMA — Database Linter Security Hardening
-- Remediates:
-- 1. function_search_path_mutable on prune_system_logs
-- 2. anon_security_definer_function_executable on 21 public functions
-- 3. authenticated_security_definer_function_executable on 22 public functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hardening Default Privileges for Future Functions
-- Prevents new functions created by postgres in schema public from
-- automatically granting EXECUTE to PUBLIC, anon, and authenticated.
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. prune_system_logs: pin search_path and restrict to service_role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_system_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
$$;

REVOKE ALL ON FUNCTION public.prune_system_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_system_logs() TO service_role;

-- ----------------------------------------------------------------------------
-- 3. Trigger Functions: Switch to SECURITY INVOKER
-- Triggers run in the caller's transaction context and do not require
-- SECURITY DEFINER privileges because they only inspect and sanitize NEW/OLD.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_admin_promotion()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
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
    NEW.trust_score               := OLD.trust_score;
    NEW.reliability_score         := OLD.reliability_score;
    NEW.completed_deals           := OLD.completed_deals;
    NEW.dispute_count             := OLD.dispute_count;
    NEW.subscription_tier         := OLD.subscription_tier;
    NEW.role_subscription_tiers   := OLD.role_subscription_tiers;
    NEW.phone_verified            := OLD.phone_verified;
    NEW.is_active                 := OLD.is_active;
  END IF;

  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.prevent_self_admin_promotion() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.prevent_order_field_tampering()
RETURNS trigger LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.offer_id             := OLD.offer_id;
    NEW.listing_id           := OLD.listing_id;
    NEW.buyer_id             := OLD.buyer_id;
    NEW.seller_id            := OLD.seller_id;
    NEW.quantity_kg          := OLD.quantity_kg;
    NEW.total_price          := OLD.total_price;
    NEW.farmer_profile_id    := OLD.farmer_profile_id;
    NEW.escrow_id            := OLD.escrow_id;
    NEW.group_listing_id     := OLD.group_listing_id;
    NEW.invoice_number       := OLD.invoice_number;
    NEW.delivery_req_id      := OLD.delivery_req_id;
    NEW.delivery_request_id  := OLD.delivery_request_id;
    NEW.pickup_district      := OLD.pickup_district;
    NEW.dropoff_district     := OLD.dropoff_district;
    NEW.paid_at              := OLD.paid_at;

    IF NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN
      NEW.confirmed_at := NOW();
    END IF;
    IF NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at THEN
      NEW.dispatched_at := NOW();
    END IF;
    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      NEW.delivered_at := NOW();
    END IF;
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      NEW.cancelled_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.prevent_order_field_tampering() FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 4. transfer_between_wallets: Support service_role execution and revoke from
-- public/anon/authenticated to prevent bypassing PIN verification.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_between_wallets(
  p_to_account_number TEXT,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL,
  p_from_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  from_transaction_id UUID,
  to_transaction_id UUID,
  new_balance NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_from_user_id  UUID := COALESCE(p_from_user_id, auth.uid());
  v_from_wallet   wallets%ROWTYPE;
  v_to_wallet     wallets%ROWTYPE;
  v_from_txn_id   UUID;
  v_to_txn_id     UUID;
  v_from_name     TEXT;
  v_to_name       TEXT;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Sender user ID required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

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

-- Revoke both the 3-arg legacy signature and 4-arg signature from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.transfer_between_wallets(TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_between_wallets(TEXT, NUMERIC, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_between_wallets(TEXT, NUMERIC, TEXT, UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. Revoke anon and authenticated access on all sensitive RPCs
-- Ensures all financial, stock-locking, and transaction functions are executable
-- solely by service_role (called from server-side Next.js routes).
-- ----------------------------------------------------------------------------

-- check_rate_limit
ALTER FUNCTION public.check_rate_limit(TEXT, INT, INT) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

-- claim_consultation_payment
ALTER FUNCTION public.claim_consultation_payment(UUID, UUID, NUMERIC, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_consultation_payment(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_consultation_payment(UUID, UUID, NUMERIC, NUMERIC) TO service_role;

-- claim_delivery_payment
ALTER FUNCTION public.claim_delivery_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_delivery_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_delivery_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) TO service_role;

-- claim_deposit
ALTER FUNCTION public.claim_deposit(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_deposit(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_deposit(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) TO service_role;

-- claim_escrow_fund
ALTER FUNCTION public.claim_escrow_fund(UUID, UUID, UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_escrow_fund(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_fund(UUID, UUID, UUID, NUMERIC) TO service_role;

-- claim_escrow_fund_offer
ALTER FUNCTION public.claim_escrow_fund_offer(UUID, UUID, UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_escrow_fund_offer(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_fund_offer(UUID, UUID, UUID, NUMERIC) TO service_role;

-- claim_escrow_fund_supplier_order
ALTER FUNCTION public.claim_escrow_fund_supplier_order(UUID, UUID, UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_escrow_fund_supplier_order(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_fund_supplier_order(UUID, UUID, UUID, NUMERIC) TO service_role;

-- claim_group_listing_stock
ALTER FUNCTION public.claim_group_listing_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_group_listing_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_listing_stock(UUID, NUMERIC) TO service_role;

-- claim_group_wallet_debit
ALTER FUNCTION public.claim_group_wallet_debit(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_group_wallet_debit(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_wallet_debit(UUID, NUMERIC) TO service_role;

-- claim_listing_stock
ALTER FUNCTION public.claim_listing_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_listing_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_listing_stock(UUID, NUMERIC) TO service_role;

-- claim_product_stock
ALTER FUNCTION public.claim_product_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_product_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_product_stock(UUID, NUMERIC) TO service_role;

-- claim_wallet_debit
ALTER FUNCTION public.claim_wallet_debit(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.claim_wallet_debit(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wallet_debit(UUID, NUMERIC) TO service_role;

-- debit_wallet (alias for claim_wallet_debit)
CREATE OR REPLACE FUNCTION public.debit_wallet(p_wallet_id UUID, p_amount NUMERIC)
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

REVOKE ALL ON FUNCTION public.debit_wallet(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC) TO service_role;


-- create_pos_sale
ALTER FUNCTION public.create_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, TEXT, NUMERIC, UUID) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.create_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, TEXT, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, TEXT, NUMERIC, UUID) TO service_role;

-- credit_group_wallet
ALTER FUNCTION public.credit_group_wallet(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.credit_group_wallet(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_group_wallet(UUID, NUMERIC) TO service_role;

-- credit_wallet
ALTER FUNCTION public.credit_wallet(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC) TO service_role;

-- receive_purchase_order
ALTER FUNCTION public.receive_purchase_order(UUID) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.receive_purchase_order(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(UUID) TO service_role;

-- release_group_listing_stock
ALTER FUNCTION public.release_group_listing_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.release_group_listing_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_group_listing_stock(UUID, NUMERIC) TO service_role;

-- release_listing_stock
ALTER FUNCTION public.release_listing_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.release_listing_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_listing_stock(UUID, NUMERIC) TO service_role;

-- release_product_stock
ALTER FUNCTION public.release_product_stock(UUID, NUMERIC) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.release_product_stock(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_product_stock(UUID, NUMERIC) TO service_role;
