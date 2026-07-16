-- Bulk orders: a farmer group leader requests a large quantity from an agro
-- dealer; the dealer decides the discount by quoting their own unit price
-- back (rather than a fixed pre-set discount tier) before the order is
-- confirmed. Reuses supplier_orders (same table normal farmer input orders
-- use) rather than a parallel table, adding a request/quote stage in front
-- of the existing pending → confirmed → delivered flow.
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS is_bulk_order BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS requested_quantity NUMERIC(12,2);
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES farmer_groups(id) ON DELETE SET NULL;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS group_name TEXT;

ALTER TABLE supplier_orders DROP CONSTRAINT IF EXISTS supplier_orders_status_check;
ALTER TABLE supplier_orders ADD CONSTRAINT supplier_orders_status_check
  CHECK (status = ANY (ARRAY['quote_requested', 'quoted', 'pending', 'confirmed', 'delivered', 'cancelled']));

CREATE INDEX IF NOT EXISTS idx_supplier_orders_group ON supplier_orders(group_id) WHERE group_id IS NOT NULL;
