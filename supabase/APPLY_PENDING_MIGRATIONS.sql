-- ============================================================================
-- KULIMA — Consolidated pending migrations
-- Paste this entire file into Supabase SQL Editor and run.
-- All statements use IF NOT EXISTS / DROP IF EXISTS guards — safe to re-run.
-- ============================================================================

-- ============================================================================
-- audit_logs table + trigger (from 20260615000001 / 20260615000002)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action        TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id   UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata      JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address    TEXT;

UPDATE audit_logs SET action = 'unknown'        WHERE action IS NULL;
UPDATE audit_logs SET resource_type = 'unknown' WHERE resource_type IS NULL;

ALTER TABLE audit_logs ALTER COLUMN action        SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN action        SET DEFAULT 'unknown';
ALTER TABLE audit_logs ALTER COLUMN resource_type SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN resource_type SET DEFAULT 'unknown';

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit" ON audit_logs;
CREATE POLICY "admin_read_audit" ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON audit_logs(user_id);

GRANT ALL ON audit_logs TO service_role;

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _action      TEXT;
  _resource_id UUID;
  _meta        JSONB := '{}';
BEGIN
  IF    TG_OP = 'INSERT' THEN _action := 'create';
  ELSIF TG_OP = 'DELETE' THEN _action := 'delete';
  ELSE
    _action := 'update';
    IF TG_TABLE_NAME = 'verifications' THEN
      IF NEW.status = 'approved' AND OLD.status != 'approved' THEN _action := 'approve'; END IF;
      IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN _action := 'reject';  END IF;
    END IF;
    IF TG_TABLE_NAME = 'fraud_flags' THEN
      IF NEW.status = 'resolved'  THEN _action := 'resolve';  END IF;
      IF NEW.status = 'dismissed' THEN _action := 'dismiss';  END IF;
    END IF;
    IF TG_TABLE_NAME = 'disputes' THEN
      IF NEW.status = 'resolved' THEN _action := 'resolve'; END IF;
    END IF;
    IF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role THEN
      _meta := jsonb_build_object('role_from', OLD.role, 'role_to', NEW.role);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN _resource_id := OLD.id;
  ELSE                      _resource_id := NEW.id;
  END IF;

  IF _meta = '{}' THEN
    IF TG_TABLE_NAME = 'listings'         AND TG_OP != 'DELETE' THEN _meta := jsonb_build_object('crop_type', NEW.crop_type, 'status', NEW.status); END IF;
    IF TG_TABLE_NAME = 'offers'           AND TG_OP != 'DELETE' THEN _meta := jsonb_build_object('status', NEW.status, 'offered_price', NEW.offered_price); END IF;
    IF TG_TABLE_NAME = 'verifications'    AND TG_OP != 'DELETE' THEN _meta := jsonb_build_object('level', NEW.level, 'status', NEW.status); END IF;
    IF TG_TABLE_NAME = 'delivery_requests' AND TG_OP = 'UPDATE'  THEN _meta := jsonb_build_object('status_from', OLD.status, 'status_to', NEW.status); END IF;
  END IF;

  INSERT INTO audit_logs (action, resource_type, resource_id, metadata)
  VALUES (_action, TG_TABLE_NAME, _resource_id, _meta);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_profiles         ON profiles;
DROP TRIGGER IF EXISTS audit_listings         ON listings;
DROP TRIGGER IF EXISTS audit_offers           ON offers;
DROP TRIGGER IF EXISTS audit_offers_insert    ON offers;
DROP TRIGGER IF EXISTS audit_offers_update    ON offers;
DROP TRIGGER IF EXISTS audit_verifications    ON verifications;
DROP TRIGGER IF EXISTS audit_delivery_requests ON delivery_requests;
DROP TRIGGER IF EXISTS audit_fraud_flags      ON fraud_flags;
DROP TRIGGER IF EXISTS audit_disputes         ON disputes;

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_listings
  AFTER INSERT OR UPDATE OR DELETE ON listings FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_offers_insert
  AFTER INSERT ON offers FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_offers_update
  AFTER UPDATE ON offers FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_verifications
  AFTER INSERT OR UPDATE ON verifications FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_delivery_requests
  AFTER UPDATE ON delivery_requests FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_fraud_flags
  AFTER INSERT OR UPDATE ON fraud_flags FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_disputes
  AFTER INSERT OR UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ── 1. listings: group listing columns + approval workflow ──────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_group_listing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS group_id         UUID,
  ADD COLUMN IF NOT EXISTS approval_status  TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_approval ON listings(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_group    ON listings(group_id) WHERE group_id IS NOT NULL;

-- ── 2. delivery_requests: Uber-style delivery columns ──────────────────────
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

-- ── 3. vehicles: cold-chain capability ─────────────────────────────────────
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_cold_capable BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. driver_assignments table ─────────────────────────────────────────────
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

DROP POLICY IF EXISTS "driver_own_assignment"      ON driver_assignments;
DROP POLICY IF EXISTS "requester_view_assignments" ON driver_assignments;
DROP POLICY IF EXISTS "admin_driver_assignment"    ON driver_assignments;

CREATE POLICY "driver_own_assignment" ON driver_assignments
  FOR ALL USING (driver_id = (SELECT auth.uid()));

CREATE POLICY "requester_view_assignments" ON driver_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_id
        AND dr.requester_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "admin_driver_assignment" ON driver_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_driver_assign_delivery ON driver_assignments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_driver_assign_driver   ON driver_assignments(driver_id, status);

GRANT ALL ON driver_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE ON driver_assignments TO authenticated;

-- ── 5. notifications: add 'delivery' type ──────────────────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN ('rain', 'price', 'pest', 'offer', 'loan', 'system', 'delivery'));

-- ── 6. orders: add disputed + escrow columns ───────────────────────────────
-- Extend status constraint to include disputed, awaiting_payment, paid
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending','confirmed','dispatched',
    'awaiting_payment','paid','in_transit',
    'delivered','completed','cancelled','disputed'
  )
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS awaiting_payment_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_requested_at  TIMESTAMPTZ;

-- Computed return expiry (2-day window) — only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'return_expires_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN return_expires_at TIMESTAMPTZ
      GENERATED ALWAYS AS (return_requested_at + INTERVAL '2 days') STORED;
  END IF;
END $$;

-- ── 7. escrow_accounts: link to order + pending status ─────────────────────
ALTER TABLE escrow_accounts
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE escrow_accounts DROP CONSTRAINT IF EXISTS escrow_accounts_status_check;
ALTER TABLE escrow_accounts ADD CONSTRAINT escrow_accounts_status_check CHECK (
  status IN ('pending', 'funded', 'released', 'refunded', 'disputed')
);

CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrow_accounts(order_id);

-- ── 8. orders: escrow FK (after escrow_accounts has order_id) ───────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE SET NULL;

-- ── 9. wallet_transactions: expanded types + order FK ───────────────────────
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (
  type IN (
    'deposit','withdrawal',
    'escrow_lock','escrow_release','escrow_refund',
    'fee','payout',
    'transfer_in','transfer_out'
  )
);

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_status_check CHECK (
  status IN ('pending', 'completed', 'failed', 'reversed')
);

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- ── 10. platform_commission table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_commission (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_percent            DECIMAL(5,2) NOT NULL DEFAULT 2.50 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  min_fee_ugx             DECIMAL(12,2) NOT NULL DEFAULT 500,
  max_fee_ugx             DECIMAL(12,2),
  platform_wallet_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  note                    TEXT,
  updated_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_one_active ON platform_commission(active) WHERE active = TRUE;

ALTER TABLE platform_commission ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_commission" ON platform_commission;
DROP POLICY IF EXISTS "service_read_commission"  ON platform_commission;

CREATE POLICY "admin_manage_commission" ON platform_commission FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_read_commission" ON platform_commission FOR SELECT USING (TRUE);

GRANT ALL ON platform_commission TO service_role;
GRANT SELECT ON platform_commission TO authenticated;

INSERT INTO platform_commission (rate_percent, min_fee_ugx, note)
VALUES (2.50, 500, 'Default platform rate — adjust via admin settings')
ON CONFLICT DO NOTHING;

-- ── 11. buyer_favourites table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_favourites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, farmer_id)
);

ALTER TABLE buyer_favourites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_own_favourites" ON buyer_favourites;
CREATE POLICY "buyers_own_favourites" ON buyer_favourites FOR ALL USING (buyer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_favourites_buyer ON buyer_favourites(buyer_id);

GRANT ALL ON buyer_favourites TO service_role;
GRANT SELECT, INSERT, DELETE ON buyer_favourites TO authenticated;

-- ── 12. direct_messages table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_parties_view"        ON direct_messages;
DROP POLICY IF EXISTS "dm_sender_insert"        ON direct_messages;
DROP POLICY IF EXISTS "dm_recipient_mark_read"  ON direct_messages;

CREATE POLICY "dm_parties_view" ON direct_messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "dm_sender_insert" ON direct_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);
CREATE POLICY "dm_recipient_mark_read" ON direct_messages FOR UPDATE USING (
  recipient_id = auth.uid()
) WITH CHECK (read = TRUE);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient    ON direct_messages(recipient_id, read, created_at DESC);

GRANT ALL ON direct_messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON direct_messages TO authenticated;

-- ── 13. group_messages table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_admin_all_messages" ON group_messages;
DROP POLICY IF EXISTS "group_sender_view"         ON group_messages;
DROP POLICY IF EXISTS "group_member_send"          ON group_messages;

CREATE POLICY "group_admin_all_messages" ON group_messages FOR ALL
  USING (admin_id = auth.uid());
CREATE POLICY "group_sender_view" ON group_messages FOR SELECT
  USING (sender_id = auth.uid());
CREATE POLICY "group_member_send" ON group_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_group_msgs_room ON group_messages(admin_id, created_at ASC);

GRANT ALL ON group_messages TO service_role;
GRANT SELECT, INSERT ON group_messages TO authenticated;

-- ── 14. consultations table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathologist_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disease_report_id    UUID REFERENCES disease_reports(id) ON DELETE SET NULL,
  type                 TEXT NOT NULL CHECK (type IN ('remote', 'farm_visit')),
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','matched','paid','active','completed','cancelled')),
  fee_ugx              DECIMAL(12,2) NOT NULL CHECK (fee_ugx > 0),
  farmer_district      TEXT,
  pathologist_district TEXT,
  notes                TEXT,
  scheduled_at         TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  payment_txn_id       UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_parties" ON consultations;
DROP POLICY IF EXISTS "admin_consultations"   ON consultations;

CREATE POLICY "consultation_parties" ON consultations FOR ALL USING (
  farmer_id = auth.uid() OR pathologist_id = auth.uid()
);
CREATE POLICY "admin_consultations" ON consultations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_consultations_farmer      ON consultations(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_pathologist ON consultations(pathologist_id, status);

GRANT ALL ON consultations TO service_role;
GRANT SELECT, INSERT, UPDATE ON consultations TO authenticated;

-- ── 15. supplier_products: flash deals columns ──────────────────────────────
ALTER TABLE supplier_products
  ADD COLUMN IF NOT EXISTS is_flash_deal   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flash_price_ugx DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS flash_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flash_ends_at   TIMESTAMPTZ;

-- ── 16. farmer_groups: group wallet ─────────────────────────────────────────
ALTER TABLE farmer_groups
  ADD COLUMN IF NOT EXISTS wallet_balance    DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 17. orders: group_listing_id ────────────────────────────────────────────
-- NOTE: Only runs if group_listings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_listings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'group_listing_id'
    ) THEN
      ALTER TABLE orders ADD COLUMN group_listing_id UUID REFERENCES group_listings(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_group_listing ON orders(group_listing_id) WHERE group_listing_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ── 18. group_wallet_transactions table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_wallet_transactions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_admin_id UUID          NOT NULL,
  order_id       UUID,
  type           TEXT          NOT NULL CHECK (type IN ('sale_payout','contribution','withdrawal','fee')),
  amount         DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description    TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE group_wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group leaders view own group wallet transactions" ON group_wallet_transactions;
DROP POLICY IF EXISTS "Service manages group wallet transactions"         ON group_wallet_transactions;

CREATE POLICY "Group leaders view own group wallet transactions"
  ON group_wallet_transactions FOR SELECT
  USING (group_admin_id = (SELECT auth.uid()));

CREATE POLICY "Service manages group wallet transactions"
  ON group_wallet_transactions FOR ALL WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_group_wallet_txns_admin ON group_wallet_transactions(group_admin_id, created_at DESC);

GRANT ALL ON group_wallet_transactions TO service_role;
GRANT SELECT ON group_wallet_transactions TO authenticated;

-- ── 19. profiles: ensure roles array column exists ──────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: copy primary role into roles array for existing users who have roles = {}
UPDATE profiles SET roles = ARRAY[role] WHERE array_length(roles, 1) IS NULL AND role IS NOT NULL;

-- ============================================================================
-- 2026-06-21: Input returns table
-- ============================================================================

CREATE TABLE IF NOT EXISTS input_returns (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references supplier_orders(id) on delete cascade,
  farmer_id         uuid not null references profiles(id),
  supplier_id       uuid not null references profiles(id),
  reason            text not null,
  quantity_returned numeric(12,2) not null,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  supplier_note     text,
  notes             text,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  updated_at        timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS input_returns_farmer_id_idx   ON input_returns(farmer_id);
CREATE INDEX IF NOT EXISTS input_returns_supplier_id_idx ON input_returns(supplier_id);
CREATE INDEX IF NOT EXISTS input_returns_order_id_idx    ON input_returns(order_id);
CREATE INDEX IF NOT EXISTS input_returns_status_idx      ON input_returns(status);

ALTER TABLE input_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farmer view own returns"   ON input_returns;
DROP POLICY IF EXISTS "supplier view returns"     ON input_returns;
DROP POLICY IF EXISTS "farmer create return"      ON input_returns;
DROP POLICY IF EXISTS "supplier resolve return"   ON input_returns;
DROP POLICY IF EXISTS "admin full access"         ON input_returns;

CREATE POLICY "farmer view own returns" ON input_returns
  FOR SELECT USING (farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "supplier view returns" ON input_returns
  FOR SELECT USING (supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "farmer create return" ON input_returns
  FOR INSERT WITH CHECK (farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "supplier resolve return" ON input_returns
  FOR UPDATE USING (supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "admin full access" ON input_returns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND (role = 'admin' OR roles @> ARRAY['admin']))
  );

-- ============================================================================
-- Done. All pending migrations applied.
-- ============================================================================
