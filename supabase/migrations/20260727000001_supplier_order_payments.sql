-- ============================================================================
-- KULIMA — Atomic stock claims + escrow-backed payment for supplier orders
-- Fixes two real gaps found while planning the POS system:
-- 1. POST /api/supplier-orders decremented stock_qty with a plain read-then-
--    write, explicitly commented "best-effort... not transactional" — the
--    same double-sell race already fixed elsewhere in this codebase via
--    claim_listing_stock. claim_product_stock/release_product_stock close it
--    for supplier_products the same way.
-- 2. Supplier orders had NO payment integration at all — no escrow, no
--    buyer wallet debit, no supplier wallet credit. The supplier/wallet page
--    showed a balance nothing ever filled. This adds a third nullable "kind"
--    FK to escrow_accounts (alongside the existing order_id/offer_id) and a
--    matching claim_escrow_fund_supplier_order RPC, mirroring
--    claim_escrow_fund_offer exactly.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE escrow_accounts
  ADD COLUMN IF NOT EXISTS supplier_order_id UUID REFERENCES supplier_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS escrow_accounts_supplier_order_id_uniq
  ON escrow_accounts (supplier_order_id) WHERE (supplier_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_escrow_supplier_order ON escrow_accounts(supplier_order_id);

ALTER TABLE supplier_orders
  ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_orders_payment_status_check'
  ) THEN
    ALTER TABLE supplier_orders ADD CONSTRAINT supplier_orders_payment_status_check
      CHECK (payment_status IN ('pending','escrowed','released','refunded'));
  END IF;
END $$;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS supplier_order_id UUID REFERENCES supplier_orders(id) ON DELETE SET NULL;

-- Atomically reserves stock on a supplier product. Returns FALSE (no
-- exception) if there isn't enough left — callers treat that as "someone
-- else already bought it" / stock ran out between page-load and checkout.
CREATE OR REPLACE FUNCTION claim_product_stock(p_product_id UUID, p_qty NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  UPDATE supplier_products
  SET stock_qty = stock_qty - p_qty, updated_at = NOW()
  WHERE id = p_product_id AND stock_qty >= p_qty;

  RETURN FOUND;
END; $$;

-- Rolls back a claim (order-insert or escrow-fund failed after stock was
-- already reserved, or a cancelled order returns stock) — additive, so it
-- can't clobber a concurrent legitimate change.
CREATE OR REPLACE FUNCTION release_product_stock(p_product_id UUID, p_qty NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE supplier_products
  SET stock_qty = stock_qty + p_qty, updated_at = NOW()
  WHERE id = p_product_id;
END; $$;

-- Mirrors claim_escrow_fund_offer exactly, keyed by supplier_order_id instead
-- of offer_id — locks the buyer's wallet row, inserts the escrow row (unique
-- on supplier_order_id), then debits, all in one transaction. A concurrent
-- duplicate "fund" call for the same order fails on the unique insert before
-- any money moves.
CREATE OR REPLACE FUNCTION claim_escrow_fund_supplier_order(
  p_supplier_order_id UUID,
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
    INSERT INTO escrow_accounts (supplier_order_id, buyer_user_id, seller_user_id, amount, status)
    VALUES (p_supplier_order_id, p_buyer_user_id, p_seller_user_id, p_amount, 'funded')
    RETURNING id INTO v_escrow_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Escrow already funded for this order';
  END;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, supplier_order_id, description)
  VALUES (v_wallet.id, p_buyer_user_id, 'escrow_lock', p_amount, 'completed', p_supplier_order_id, 'Escrow funded for supplier order');

  RETURN v_escrow_id;
END; $$;

REVOKE ALL ON FUNCTION claim_product_stock(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_product_stock(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_escrow_fund_supplier_order(UUID, UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_product_stock(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION release_product_stock(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION claim_escrow_fund_supplier_order(UUID, UUID, UUID, NUMERIC) TO service_role;
