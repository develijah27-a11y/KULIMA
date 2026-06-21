-- ============================================================================
-- KULIMA — Escrow timing fix, transaction enhancements, commission system
-- ============================================================================

-- ── 1. Orders: add awaiting_payment status ───────────────────────────────────
-- Buyer now pays AFTER the seller ships, not at offer acceptance
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',           -- order placed by buyer
    'confirmed',         -- farmer confirms order
    'dispatched',        -- farmer ships; buyer notified to pay
    'awaiting_payment',  -- waiting for buyer to fund escrow
    'paid',              -- escrow funded; goods in transit
    'in_transit',        -- carrier has the goods
    'delivered',         -- goods arrived; awaiting buyer confirmation
    'completed',         -- buyer confirmed; escrow released to seller
    'cancelled',         -- order cancelled (refund if escrow was funded)
    'disputed'           -- buyer raised a dispute; admin must intervene
  )
);

-- Track which escrow covers this order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE SET NULL;
-- Timestamps for new statuses
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awaiting_payment_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at            TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS disputed_at        TIMESTAMPTZ;
-- 2-day return window: recorded when buyer requests a return
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_expires_at   TIMESTAMPTZ
  GENERATED ALWAYS AS (return_requested_at + INTERVAL '2 days') STORED;

-- ── 2. Escrow accounts: link to order (not just offer) ───────────────────────
ALTER TABLE escrow_accounts ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
-- Add 'pending' status so escrow can be pre-created before buyer pays
ALTER TABLE escrow_accounts DROP CONSTRAINT IF EXISTS escrow_accounts_status_check;
ALTER TABLE escrow_accounts ADD CONSTRAINT escrow_accounts_status_check CHECK (
  status IN ('pending', 'funded', 'released', 'refunded', 'disputed')
);
CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrow_accounts(order_id);

-- ── 3. Wallet transactions: expand types and statuses ───────────────────────
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (
  type IN (
    'deposit',         -- buyer tops up wallet (mobile money)
    'withdrawal',      -- user withdraws to mobile money
    'escrow_lock',     -- funds locked into escrow
    'escrow_release',  -- escrow released to seller (after delivery)
    'escrow_refund',   -- escrow returned to buyer (dispute/cancel)
    'fee',             -- platform commission deducted from payout
    'payout',          -- net payout to seller after fee deduction
    'transfer_in',     -- internal transfer received
    'transfer_out'     -- internal transfer sent
  )
);

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_status_check CHECK (
  status IN ('pending', 'completed', 'failed', 'reversed')
);

-- Proper FK to orders so we can JOIN without going through metadata JSONB
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- ── 4. Platform commission settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_commission (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_percent    DECIMAL(5,2) NOT NULL DEFAULT 2.50 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  min_fee_ugx     DECIMAL(12,2) NOT NULL DEFAULT 500,    -- floor fee per transaction
  max_fee_ugx     DECIMAL(12,2),                          -- ceiling (NULL = no cap)
  -- Which wallet receives the platform's share
  platform_wallet_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT,
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active row at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_one_active ON platform_commission(active) WHERE active = TRUE;

ALTER TABLE platform_commission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_commission" ON platform_commission FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_read_commission" ON platform_commission FOR SELECT USING (TRUE);

GRANT ALL ON platform_commission TO service_role;
GRANT SELECT ON platform_commission TO authenticated;

-- Seed default commission (2.5%)
INSERT INTO platform_commission (rate_percent, min_fee_ugx, note)
VALUES (2.50, 500, 'Default platform rate — adjust via admin settings')
ON CONFLICT DO NOTHING;

-- ── 5. Buyer favourites ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, farmer_id)
);

ALTER TABLE buyer_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers_own_favourites" ON buyer_favourites FOR ALL USING (buyer_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_favourites_buyer ON buyer_favourites(buyer_id);

GRANT ALL ON buyer_favourites TO service_role;
GRANT SELECT, INSERT, DELETE ON buyer_favourites TO authenticated;

-- ── 6. Direct messages (pathologist-farmer chat) ─────────────────────────────
-- conversation_id = least(userId1, userId2) || ':' || greatest(userId1, userId2)
-- Deterministic from the app — no separate lookup needed.
CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,  -- computed: sort([a,b]).join(':')
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
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

-- ── 7. Group chat messages ────────────────────────────────────────────────────
-- admin_id = the group leader's auth.uid — same key used across all group_* tables.
-- This lets the group admin + any verified KULIMA user in the same group chat.
CREATE TABLE IF NOT EXISTS group_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL,          -- group room identifier (leader's auth.uid)
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT,                   -- denormalized for fast render
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
-- Group admin can always see + send in their own room
CREATE POLICY "group_admin_all_messages" ON group_messages FOR ALL
  USING (admin_id = auth.uid());
-- Any authenticated user can view messages where they are the sender
CREATE POLICY "group_sender_view" ON group_messages FOR SELECT
  USING (sender_id = auth.uid());
-- Any authenticated user can send to a group they are explicitly invited to
-- (controlled at the application layer — open INSERT for now, locked by admin_id logic)
CREATE POLICY "group_member_send" ON group_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_group_msgs_room ON group_messages(admin_id, created_at ASC);

GRANT ALL ON group_messages TO service_role;
GRANT SELECT, INSERT ON group_messages TO authenticated;

-- ── 8. Paid consultations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathologist_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disease_report_id UUID REFERENCES disease_reports(id) ON DELETE SET NULL,
  type              TEXT NOT NULL CHECK (type IN ('remote', 'farm_visit')),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','matched','paid','active','completed','cancelled')),
  fee_ugx           DECIMAL(12,2) NOT NULL CHECK (fee_ugx > 0),
  farmer_district   TEXT,
  pathologist_district TEXT,
  notes             TEXT,
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  payment_txn_id    UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consultation_parties" ON consultations FOR ALL USING (
  farmer_id = auth.uid() OR pathologist_id = auth.uid()
);
CREATE POLICY "admin_consultations" ON consultations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_consultations_farmer      ON consultations(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_pathologist ON consultations(pathologist_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_district    ON consultations(farmer_district, type, status);

GRANT ALL ON consultations TO service_role;
GRANT SELECT, INSERT, UPDATE ON consultations TO authenticated;

-- ── 9. Supplier flash deals ──────────────────────────────────────────────────
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS is_flash_deal    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS flash_price_ugx  DECIMAL(12,2);
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS flash_starts_at  TIMESTAMPTZ;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS flash_ends_at    TIMESTAMPTZ;

-- ── 10. Listing approval workflow ────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Existing active listings are auto-approved so nothing breaks
UPDATE listings SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_approval ON listings(approval_status, created_at DESC);
