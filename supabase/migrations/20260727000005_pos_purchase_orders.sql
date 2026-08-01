-- ============================================================================
-- KULIMA — POS purchase orders (Phase 6 of the approved POS + subscriptions plan)
-- Restocking paperwork — a supplier tracking what they've ordered from their
-- own upstream distributor and whether it's arrived. No payment/escrow/
-- commission involved (that's between the supplier and their distributor,
-- outside the platform), unlike every other money-moving table in this app.
-- Gated to Enterprise tier at the API layer, same as staff accounts/stores.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pos_purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_name   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  notes         TEXT,
  expected_date DATE,
  received_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_purchase_orders_status_check') THEN
    ALTER TABLE pos_purchase_orders ADD CONSTRAINT pos_purchase_orders_status_check
      CHECK (status IN ('draft','ordered','received','cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_po_store    ON pos_purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_pos_po_supplier  ON pos_purchase_orders(supplier_id);

ALTER TABLE pos_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all_pos_po" ON pos_purchase_orders;
CREATE POLICY "owner_all_pos_po" ON pos_purchase_orders FOR ALL USING (
  supplier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "service_role_all_pos_po" ON pos_purchase_orders;
CREATE POLICY "service_role_all_pos_po" ON pos_purchase_orders FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS pos_purchase_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id     UUID NOT NULL REFERENCES pos_purchase_orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES supplier_products(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  quantity              NUMERIC(12,2) NOT NULL,
  unit_cost_ugx         NUMERIC(12,2)
);
CREATE INDEX IF NOT EXISTS idx_pos_po_items_po ON pos_purchase_order_items(purchase_order_id);

ALTER TABLE pos_purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all_pos_po_items" ON pos_purchase_order_items;
CREATE POLICY "owner_all_pos_po_items" ON pos_purchase_order_items FOR ALL USING (
  purchase_order_id IN (SELECT id FROM pos_purchase_orders WHERE supplier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "service_role_all_pos_po_items" ON pos_purchase_order_items;
CREATE POLICY "service_role_all_pos_po_items" ON pos_purchase_order_items FOR ALL TO service_role USING (true);

-- Marking a PO received bumps stock_qty for every line with a matched
-- product — the one place in the POS system that ADDS stock rather than
-- claiming it. Single transaction so a partial failure can't credit some
-- lines and not others.
CREATE OR REPLACE FUNCTION receive_purchase_order(p_purchase_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN SELECT product_id, quantity FROM pos_purchase_order_items WHERE purchase_order_id = p_purchase_order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE supplier_products
      SET stock_qty = stock_qty + v_item.quantity, updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE pos_purchase_orders SET status = 'received', received_at = NOW(), updated_at = NOW() WHERE id = p_purchase_order_id;
END; $$;

REVOKE ALL ON FUNCTION receive_purchase_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_purchase_order(UUID) TO service_role;
