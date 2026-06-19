-- ============================================================================
-- KULIMA — Orders table + unified notifications
-- Adds: orders table for Jumia-style order tracking, user_id on notifications
-- ============================================================================

-- ── ORDERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID          NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  offer_id            UUID          REFERENCES offers(id) ON DELETE SET NULL,
  buyer_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_profile_id   UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crop_type           TEXT          NOT NULL,
  quantity_kg         DECIMAL(12,2) NOT NULL CHECK (quantity_kg > 0),
  unit_price          DECIMAL(12,2) NOT NULL CHECK (unit_price > 0),
  total_amount        DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
  status              TEXT          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','dispatched','in_transit','delivered','completed','cancelled')),
  delivery_request_id UUID          REFERENCES delivery_requests(id) ON DELETE SET NULL,
  buyer_note          TEXT,
  farmer_note         TEXT,
  pickup_district     TEXT,
  dropoff_district    TEXT,
  confirmed_at        TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  in_transit_at       TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers view own orders"            ON orders;
DROP POLICY IF EXISTS "Buyers create orders"              ON orders;
DROP POLICY IF EXISTS "Buyers complete own orders"        ON orders;
DROP POLICY IF EXISTS "Farmers view orders"               ON orders;
DROP POLICY IF EXISTS "Farmers update order status"       ON orders;
DROP POLICY IF EXISTS "Admin all orders"                  ON orders;

CREATE POLICY "Buyers view own orders" ON orders
  FOR SELECT USING (buyer_id = (SELECT auth.uid()));

CREATE POLICY "Buyers create orders" ON orders
  FOR INSERT WITH CHECK (buyer_id = (SELECT auth.uid()));

CREATE POLICY "Buyers complete own orders" ON orders
  FOR UPDATE USING (
    buyer_id = (SELECT auth.uid())
    AND status IN ('pending', 'delivered')
  );

CREATE POLICY "Farmers view orders" ON orders
  FOR SELECT USING (
    farmer_profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Farmers update order status" ON orders
  FOR UPDATE USING (
    farmer_profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Admin all orders" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_orders_buyer        ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_farmer       ON orders(farmer_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_listing      ON orders(listing_id);

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── NOTIFICATIONS — add user_id + expand types ────────────────────────────────
ALTER TABLE notifications ALTER COLUMN farmer_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN (
    'rain','price','pest','offer','loan','system',
    'order','delivery','payment','alert','disease'
  ));

-- Update RLS so every role can see their own notifications via user_id
DROP POLICY IF EXISTS "Users can view own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users view own notifications"       ON notifications;
DROP POLICY IF EXISTS "Users update own notifications"     ON notifications;
DROP POLICY IF EXISTS "Service inserts notifications"      ON notifications;

CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (
    (farmer_id IS NOT NULL AND farmer_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (
    (farmer_id IS NOT NULL AND farmer_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "Service inserts notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, read, created_at DESC);

GRANT ALL ON orders TO service_role;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
