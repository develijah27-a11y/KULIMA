-- ──────────────────────────────────────────────────────────────────────────────
-- Group wallet: embedded balance + group_id on orders for routing proceeds
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Add wallet_balance to farmer_groups
ALTER TABLE farmer_groups
  ADD COLUMN IF NOT EXISTS wallet_balance       DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Add group_listing_id to orders (so we know when an order came from a group listing)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS group_listing_id UUID REFERENCES group_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_group_listing ON orders(group_listing_id) WHERE group_listing_id IS NOT NULL;

-- 3. Group wallet transactions log (for audit history)
CREATE TABLE IF NOT EXISTS group_wallet_transactions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_admin_id      UUID          NOT NULL,  -- group leader auth.uid (matches farmer_groups pattern)
  order_id            UUID,
  type                TEXT          NOT NULL CHECK (type IN ('sale_payout','contribution','withdrawal','fee')),
  amount              DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description         TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE group_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group leaders view own group wallet transactions"
  ON group_wallet_transactions FOR SELECT
  USING (group_admin_id = (SELECT auth.uid()));
CREATE POLICY "Service manages group wallet transactions"
  ON group_wallet_transactions FOR ALL WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_group_wallet_txns_admin ON group_wallet_transactions(group_admin_id, created_at DESC);

GRANT ALL ON group_wallet_transactions TO service_role;
GRANT SELECT ON group_wallet_transactions TO authenticated;
