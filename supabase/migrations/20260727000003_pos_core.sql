-- ============================================================================
-- KULIMA — POS core (Phase 3 of the approved POS + subscriptions plan)
-- Adds in-person checkout for agro-dealer suppliers: a `stores` table
-- (introduced now, not deferred to the multi-branch phase, so nothing
-- downstream ever needs a backfill migration), barcode/SKU/cost-price on
-- supplier_products, and pos_sales/pos_sale_items recording each till
-- transaction. Reuses the exact commission machinery already used for
-- marketplace orders (same rate, via platform_commission) — POS sales are
-- not commission-free per the site owner's explicit decision.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS stores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Main Branch',
  is_primary   BOOLEAN NOT NULL DEFAULT true,
  district     TEXT,
  address      TEXT,
  phone        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stores_supplier ON stores(supplier_id);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all_stores" ON stores;
CREATE POLICY "owner_all_stores" ON stores FOR ALL USING (
  supplier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "service_role_all_stores" ON stores;
CREATE POLICY "service_role_all_stores" ON stores FOR ALL TO service_role USING (true);

-- Backfill: every existing supplier that has ever listed a product gets a
-- default primary store, so supplier_products.store_id below can be set
-- non-null for all pre-existing rows in the same migration.
INSERT INTO stores (supplier_id, name, is_primary)
SELECT DISTINCT supplier_id, 'Main Branch', true
FROM supplier_products
WHERE supplier_id NOT IN (SELECT supplier_id FROM stores)
ON CONFLICT DO NOTHING;

ALTER TABLE supplier_products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS cost_price_ugx NUMERIC(12,2);

UPDATE supplier_products sp
SET store_id = s.id
FROM stores s
WHERE sp.store_id IS NULL AND s.supplier_id = sp.supplier_id AND s.is_primary = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_products_store_barcode
  ON supplier_products(store_id, barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_sales (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id           UUID,  -- REFERENCES pos_staff(id) added in Phase 4; nullable now (owner-run sale)
  customer_name      TEXT,
  customer_phone     TEXT,
  subtotal_ugx       NUMERIC(12,2) NOT NULL,
  discount_ugx       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ugx          NUMERIC(12,2) NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'cash',
  status             TEXT NOT NULL DEFAULT 'completed',
  commission_fee_ugx NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_ugx            NUMERIC(12,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_sales_payment_method_check') THEN
    ALTER TABLE pos_sales ADD CONSTRAINT pos_sales_payment_method_check
      CHECK (payment_method IN ('cash','wallet','mobile_money'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_sales_status_check') THEN
    ALTER TABLE pos_sales ADD CONSTRAINT pos_sales_status_check
      CHECK (status IN ('completed','refunded','voided'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_sales_store    ON pos_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_supplier  ON pos_sales(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created   ON pos_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer_phone ON pos_sales(customer_phone) WHERE customer_phone IS NOT NULL;

ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all_pos_sales" ON pos_sales;
CREATE POLICY "owner_all_pos_sales" ON pos_sales FOR ALL USING (
  supplier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "service_role_all_pos_sales" ON pos_sales;
CREATE POLICY "service_role_all_pos_sales" ON pos_sales FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS pos_sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_sale_id     UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES supplier_products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  sku             TEXT,
  quantity        NUMERIC(12,2) NOT NULL,
  unit_price_ugx  NUMERIC(12,2) NOT NULL,
  line_total_ugx  NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(pos_sale_id);

ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all_pos_sale_items" ON pos_sale_items;
CREATE POLICY "owner_all_pos_sale_items" ON pos_sale_items FOR ALL USING (
  pos_sale_id IN (SELECT id FROM pos_sales WHERE supplier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "service_role_all_pos_sale_items" ON pos_sale_items;
CREATE POLICY "service_role_all_pos_sale_items" ON pos_sale_items FOR ALL TO service_role USING (true);

-- Single-transaction checkout: loops the item array, claims stock per line
-- inline (same guard as claim_product_stock but inlined since this needs to
-- share one transaction with the sale/item inserts and the commission
-- credit — a true multi-item checkout needs single-transaction atomicity
-- that N separate API-layer RPC calls can't reliably give), then credits
-- the supplier's wallet net of the same platform commission rate used for
-- marketplace orders.
CREATE OR REPLACE FUNCTION create_pos_sale(
  p_store_id UUID,
  p_supplier_user_id UUID,
  p_items JSONB,          -- [{product_id, product_name, sku, quantity, unit_price_ugx}, ...]
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_discount_ugx NUMERIC DEFAULT 0,
  p_staff_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_supplier_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC;
  v_commission RECORD;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_sale_id UUID;
  v_wallet_id UUID;
  v_platform_wallet_id UUID;
BEGIN
  SELECT id INTO v_supplier_id FROM profiles WHERE user_id = p_supplier_user_id;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Supplier profile not found';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must have at least one item';
  END IF;

  -- Pass 1: validate + claim stock for every line. Any failure aborts the
  -- whole function (and therefore the whole transaction) — a checkout with
  -- 5 items where item 4 is out of stock claims nothing at all, not 3.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty        := (v_item->>'quantity')::NUMERIC;
    v_unit_price := (v_item->>'unit_price_ugx')::NUMERIC;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_item->>'product_name';
    END IF;

    IF v_product_id IS NOT NULL THEN
      UPDATE supplier_products
      SET stock_qty = stock_qty - v_qty, updated_at = NOW()
      WHERE id = v_product_id AND supplier_id = v_supplier_id AND stock_qty >= v_qty;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Not enough stock for %', v_item->>'product_name';
      END IF;
    END IF;

    v_line_total := v_qty * v_unit_price;
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  v_total := GREATEST(v_subtotal - COALESCE(p_discount_ugx, 0), 0);

  SELECT rate_percent, min_fee_ugx, max_fee_ugx, platform_wallet_user_id
    INTO v_commission FROM platform_commission WHERE active = true LIMIT 1;
  IF v_commission IS NULL THEN
    v_fee := 0;
  ELSE
    v_fee := ROUND(v_total * v_commission.rate_percent / 100);
    IF v_fee < v_commission.min_fee_ugx THEN v_fee := v_commission.min_fee_ugx; END IF;
    IF v_commission.max_fee_ugx IS NOT NULL AND v_fee > v_commission.max_fee_ugx THEN v_fee := v_commission.max_fee_ugx; END IF;
  END IF;
  v_net := v_total - v_fee;

  INSERT INTO pos_sales (
    store_id, supplier_id, staff_id, customer_name, customer_phone,
    subtotal_ugx, discount_ugx, total_ugx, payment_method, commission_fee_ugx, net_ugx
  ) VALUES (
    p_store_id, v_supplier_id, p_staff_id, p_customer_name, p_customer_phone,
    v_subtotal, COALESCE(p_discount_ugx, 0), v_total, p_payment_method, v_fee, v_net
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO pos_sale_items (pos_sale_id, product_id, product_name, sku, quantity, unit_price_ugx, line_total_ugx)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      v_item->>'sku',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price_ugx')::NUMERIC,
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price_ugx')::NUMERIC
    );
  END LOOP;

  -- Credit the supplier's wallet, net of commission — same additive-credit
  -- pattern as credit_wallet, inlined here since it's already inside this
  -- function's transaction.
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_user_id;
  IF v_wallet_id IS NOT NULL AND v_net > 0 THEN
    UPDATE wallets SET balance = balance + v_net, updated_at = NOW() WHERE id = v_wallet_id;
    INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
    VALUES (v_wallet_id, p_supplier_user_id, 'payout', v_net, 'completed',
            'POS sale payout (' || COALESCE(v_commission.rate_percent, 0) || '% fee deducted)');
  END IF;

  IF v_commission IS NOT NULL AND v_commission.platform_wallet_user_id IS NOT NULL AND v_fee > 0 THEN
    SELECT id INTO v_platform_wallet_id FROM wallets WHERE user_id = v_commission.platform_wallet_user_id;
    IF v_platform_wallet_id IS NOT NULL THEN
      UPDATE wallets SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_platform_wallet_id;
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
      VALUES (v_platform_wallet_id, v_commission.platform_wallet_user_id, 'fee', v_fee, 'completed', 'Platform commission — POS sale');
    END IF;
  END IF;

  RETURN v_sale_id;
END; $$;

REVOKE ALL ON FUNCTION create_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, TEXT, NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, TEXT, NUMERIC, UUID) TO service_role;
