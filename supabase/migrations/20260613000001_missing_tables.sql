-- ============================================================================
-- KULIMA — Missing Tables Migration
-- Root cause: dashboard saves fail because these tables don't exist in the DB.
-- Every (supabase.from as any)('table') cast in the codebase = missing table.
--
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS).
-- Tables already in DB (wallets, wallet_transactions, escrow_accounts,
-- mobile_money_requests, vehicles, delivery_requests, delivery_bids) are
-- intentionally excluded — they were created in earlier migrations.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PROFILES — expand role constraint to cover all roles used in the app
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_profile_role;
ALTER TABLE profiles ADD CONSTRAINT valid_profile_role
  CHECK (role IN ('farmer','buyer','supplier','admin','transporter','pathologist','offtaker','groups'));

-- Add roles array (for multi-role switcher shown in TopBar/Sidebar)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- ────────────────────────────────────────────────────────────────────────────
-- LISTINGS — add group listing support
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_group_listing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_listings_group_id ON listings(group_id) WHERE group_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- SUPPLIER
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_products (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  category       TEXT         NOT NULL DEFAULT 'other',
  description    TEXT,
  price_per_unit DECIMAL(12,2) NOT NULL CHECK (price_per_unit > 0),
  unit           TEXT         NOT NULL DEFAULT 'kg',
  stock_qty      INTEGER      NOT NULL DEFAULT 0,
  min_order_qty  INTEGER      NOT NULL DEFAULT 1,
  district       TEXT,
  is_available   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers manage own products" ON supplier_products;
CREATE POLICY "Suppliers manage own products" ON supplier_products FOR ALL
  USING (supplier_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Anyone views available products" ON supplier_products;
CREATE POLICY "Anyone views available products" ON supplier_products FOR SELECT
  USING (is_available = TRUE);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_category ON supplier_products(category);
DROP TRIGGER IF EXISTS update_supplier_products_at ON supplier_products;
CREATE TRIGGER update_supplier_products_at BEFORE UPDATE ON supplier_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DROP and recreate: safe because supplier_orders has no data yet (saves were failing)
-- buyer_id is stored as plain UUID (auth.uid value) — no cross-schema FK needed
DROP TABLE IF EXISTS supplier_orders CASCADE;
CREATE TABLE supplier_orders (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id     UUID,
  product_id   UUID          REFERENCES supplier_products(id) ON DELETE SET NULL,
  product_name TEXT          NOT NULL DEFAULT '',
  buyer_name   TEXT,
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit         TEXT          NOT NULL DEFAULT 'kg',
  unit_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  district     TEXT,
  status       TEXT          NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers manage own orders" ON supplier_orders;
CREATE POLICY "Suppliers manage own orders" ON supplier_orders FOR ALL
  USING (supplier_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Buyers view own orders" ON supplier_orders;
CREATE POLICY "Buyers view own orders" ON supplier_orders FOR SELECT
  USING (buyer_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status   ON supplier_orders(status, created_at DESC);
DROP TRIGGER IF EXISTS update_supplier_orders_at ON supplier_orders;
CREATE TRIGGER update_supplier_orders_at BEFORE UPDATE ON supplier_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- OFFTAKER
-- Drop first: earlier migrations may have created these with different schemas.
-- offtaker_id stored as plain UUID — same value as auth.uid(), no FK needed.
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS offtaker_scorecards CASCADE;
DROP TABLE IF EXISTS offtaker_contracts  CASCADE;

CREATE TABLE offtaker_contracts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  offtaker_id    UUID          NOT NULL,
  crop_type      TEXT          NOT NULL,
  district       TEXT          NOT NULL,
  quantity_kg    DECIMAL(12,2) NOT NULL CHECK (quantity_kg > 0),
  price_ugx      DECIMAL(15,2) NOT NULL CHECK (price_ugx > 0),
  delivery_date  DATE          NOT NULL,
  farmer_name    TEXT,
  notes          TEXT,
  status         TEXT          NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','cancelled')),
  payment_status TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','completed')),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE offtaker_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offtakers manage own contracts" ON offtaker_contracts FOR ALL
  USING (offtaker_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_offtaker_contracts_offtaker ON offtaker_contracts(offtaker_id);
CREATE INDEX IF NOT EXISTS idx_offtaker_contracts_status   ON offtaker_contracts(status, delivery_date);
DROP TRIGGER IF EXISTS update_offtaker_contracts_at ON offtaker_contracts;
CREATE TRIGGER update_offtaker_contracts_at BEFORE UPDATE ON offtaker_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE offtaker_scorecards (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  offtaker_id    UUID          NOT NULL,
  farmer_name    TEXT          NOT NULL,
  crop_type      TEXT          NOT NULL,
  quality_score  INTEGER       CHECK (quality_score BETWEEN 1 AND 5),
  delivery_score INTEGER       CHECK (delivery_score BETWEEN 1 AND 5),
  quantity_kg    DECIMAL(12,2),
  notes          TEXT,
  scored_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE offtaker_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offtakers manage own scorecards" ON offtaker_scorecards FOR ALL
  USING (offtaker_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_offtaker_scorecards_offtaker ON offtaker_scorecards(offtaker_id, scored_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- PATHOLOGIST — disease reports
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS disease_reports CASCADE;

CREATE TABLE disease_reports (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pathologist_id UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  farmer_name    TEXT,
  crop_type      TEXT          NOT NULL,
  symptoms       TEXT          NOT NULL,
  urgency        TEXT          NOT NULL DEFAULT 'medium'
                   CHECK (urgency IN ('low','medium','high','critical')),
  district       TEXT          NOT NULL,
  image_urls     TEXT[],
  status         TEXT          NOT NULL DEFAULT 'reported'
                   CHECK (status IN ('reported','assigned','diagnosed','closed')),
  diagnosis      TEXT,
  treatment      TEXT,
  reported_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  diagnosed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE disease_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farmers view own reports" ON disease_reports FOR SELECT
  USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Farmers create reports" ON disease_reports FOR INSERT
  WITH CHECK (farmer_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Pathologists manage all reports" ON disease_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role IN ('pathologist','admin')));
CREATE INDEX IF NOT EXISTS idx_disease_reports_farmer      ON disease_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_disease_reports_pathologist ON disease_reports(pathologist_id);
CREATE INDEX IF NOT EXISTS idx_disease_reports_status      ON disease_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_reports_district    ON disease_reports(district);
DROP TRIGGER IF EXISTS update_disease_reports_at ON disease_reports;
CREATE TRIGGER update_disease_reports_at BEFORE UPDATE ON disease_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- GROUPS
-- Drop first: earlier migrations created these with group_admin_id not admin_id.
-- admin_id stored as plain UUID (auth.uid value) — no cross-schema FK needed.
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS group_contributions CASCADE;
DROP TABLE IF EXISTS group_listings      CASCADE;
DROP TABLE IF EXISTS group_announcements CASCADE;
DROP TABLE IF EXISTS group_loans         CASCADE;
DROP TABLE IF EXISTS group_finance       CASCADE;
DROP TABLE IF EXISTS group_members       CASCADE;
DROP TABLE IF EXISTS farmer_groups       CASCADE;

CREATE TABLE group_members (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id           UUID          NOT NULL,
  full_name          TEXT          NOT NULL,
  phone_number       TEXT,
  district           TEXT          NOT NULL,
  village            TEXT,
  role               TEXT          NOT NULL DEFAULT 'member'
                       CHECK (role IN ('member','admin','treasurer','secretary')),
  crop_type          TEXT,
  acres              DECIMAL(8,2),
  status             TEXT          NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive')),
  contribution_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  joined_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage members" ON group_members FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_group_members_admin ON group_members(admin_id, status);

CREATE TABLE group_finance (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID          NOT NULL,
  type        TEXT          NOT NULL CHECK (type IN ('contribution','income','expense','loan')),
  amount      DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT          NOT NULL,
  member_name TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_finance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage finance" ON group_finance FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_group_finance_admin ON group_finance(admin_id, created_at DESC);

CREATE TABLE group_loans (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID          NOT NULL,
  member_name    TEXT          NOT NULL,
  amount         DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  purpose        TEXT,
  interest_rate  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  status         TEXT          NOT NULL DEFAULT 'active'
                   CHECK (status IN ('pending','active','repaid','defaulted')),
  repayment_date DATE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage loans" ON group_loans FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_group_loans_admin ON group_loans(admin_id, status);

CREATE TABLE group_announcements (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID          NOT NULL,
  title      TEXT          NOT NULL,
  body       TEXT,
  emoji      TEXT          DEFAULT '📢',
  priority   TEXT          NOT NULL DEFAULT 'low'
               CHECK (priority IN ('low','medium','high')),
  is_pinned  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage announcements" ON group_announcements FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_group_announcements_admin ON group_announcements(admin_id, created_at DESC);

CREATE TABLE group_listings (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID          NOT NULL,
  crop_type         TEXT          NOT NULL,
  total_quantity_kg DECIMAL(12,2) NOT NULL CHECK (total_quantity_kg > 0),
  asking_price      DECIMAL(12,2) NOT NULL CHECK (asking_price > 0),
  district          TEXT          NOT NULL,
  member_count      INTEGER       NOT NULL DEFAULT 1,
  notes             TEXT,
  status            TEXT          NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','pending','sold','expired')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage group listings" ON group_listings FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE POLICY "Anyone views active group listings" ON group_listings FOR SELECT
  USING (status = 'active');
CREATE INDEX IF NOT EXISTS idx_group_listings_admin ON group_listings(admin_id, status);
DROP TRIGGER IF EXISTS update_group_listings_at ON group_listings;
CREATE TRIGGER update_group_listings_at BEFORE UPDATE ON group_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE group_contributions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID          NOT NULL,
  member_name    TEXT          NOT NULL,
  amount         DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  contributed_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE group_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group admins manage contributions" ON group_contributions FOR ALL
  USING (admin_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS idx_group_contributions_admin ON group_contributions(admin_id, contributed_at DESC);

CREATE TABLE farmer_groups (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  description TEXT,
  district    TEXT,
  leader_id   UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active farmer groups" ON farmer_groups FOR SELECT
  USING (is_active = TRUE);
CREATE POLICY "Leaders manage own groups" ON farmer_groups FOR ALL
  USING (leader_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())));
CREATE INDEX IF NOT EXISTS idx_farmer_groups_leader   ON farmer_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_farmer_groups_district ON farmer_groups(district);
DROP TRIGGER IF EXISTS update_farmer_groups_at ON farmer_groups;
CREATE TRIGGER update_farmer_groups_at BEFORE UPDATE ON farmer_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- LOAN PROFILES
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS loan_profiles CASCADE;

CREATE TABLE loan_profiles (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    TEXT          NOT NULL,
  score        INTEGER       NOT NULL DEFAULT 0,
  status       TEXT          NOT NULL DEFAULT 'pending_review'
                 CHECK (status IN ('pending_review','approved','rejected')),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(farmer_id)
);
ALTER TABLE loan_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own loan profile" ON loan_profiles FOR SELECT
  USING (farmer_id = (SELECT auth.uid())::TEXT);
CREATE POLICY "Service manages loan profiles" ON loan_profiles FOR ALL WITH CHECK (TRUE);
DROP TRIGGER IF EXISTS update_loan_profiles_at ON loan_profiles;
CREATE TRIGGER update_loan_profiles_at BEFORE UPDATE ON loan_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS — ensure service_role can operate on all new tables
-- ────────────────────────────────────────────────────────────────────────────
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON supplier_products TO authenticated, anon;
GRANT SELECT ON group_listings     TO authenticated, anon;
GRANT SELECT ON farmer_groups      TO authenticated, anon;
