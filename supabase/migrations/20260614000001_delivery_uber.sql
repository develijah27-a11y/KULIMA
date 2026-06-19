-- ============================================================================
-- KULIMA — Uber/Faras-style Delivery System v2
-- Adds: delivery type, automatic fare calculation, driver auto-matching,
--       commission tracking, and payment-on-delivery.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout).
-- ============================================================================

-- ── delivery_requests: new columns for type, fare, payment tracking ────────
ALTER TABLE delivery_requests
  ADD COLUMN IF NOT EXISTS delivery_type     TEXT    NOT NULL DEFAULT 'standard'
    CHECK (delivery_type IN ('cold', 'fast', 'standard')),
  ADD COLUMN IF NOT EXISTS estimated_fare    DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS distance_km       DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate   DECIMAL(5,2)  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS driver_earnings   DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS payment_status    TEXT    NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at      TIMESTAMPTZ;

-- ── vehicles: cold-chain capability flag ──────────────────────────────────
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_cold_capable BOOLEAN NOT NULL DEFAULT false;

-- ── driver_assignments: Uber-style matching records ────────────────────────
-- When a delivery is posted the system finds nearby available drivers and
-- creates one record per driver. Drivers accept or decline. When one accepts
-- all other records for that delivery are cancelled.
CREATE TABLE IF NOT EXISTS driver_assignments (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id   UUID        NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  driver_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  notified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  UNIQUE (delivery_id, driver_id)
);

ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_own_assignment"       ON driver_assignments;
DROP POLICY IF EXISTS "requester_view_assignments"  ON driver_assignments;
DROP POLICY IF EXISTS "admin_driver_assignment"     ON driver_assignments;

-- Driver sees and manages their own assignments
CREATE POLICY "driver_own_assignment" ON driver_assignments
  FOR ALL USING (driver_id = (SELECT auth.uid()));

-- Requester sees who was matched/assigned for their delivery
CREATE POLICY "requester_view_assignments" ON driver_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_id
        AND dr.requester_id = (SELECT auth.uid())
    )
  );

-- Admin sees everything
CREATE POLICY "admin_driver_assignment" ON driver_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_driver_assign_delivery ON driver_assignments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_driver_assign_driver   ON driver_assignments(driver_id, status);

-- ── notifications: expand type constraint to include delivery events ────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN ('rain', 'price', 'pest', 'offer', 'loan', 'system', 'delivery'));

-- ── grants ─────────────────────────────────────────────────────────────────
GRANT ALL ON driver_assignments TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
