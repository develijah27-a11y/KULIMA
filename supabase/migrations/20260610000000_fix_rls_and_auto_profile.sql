-- ============================================================================
-- KULIMA — RLS Audit & Auto-Profile Fix
-- Run this in Supabase SQL Editor (as postgres / service role)
-- ============================================================================

-- ============================================================================
-- 1. FIX PROFILES ROLE CONSTRAINT
--    Previous constraint only allowed 4 roles; app uses 8.
-- ============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_profile_role;
ALTER TABLE profiles
  ADD CONSTRAINT valid_profile_role
  CHECK (role IN ('farmer', 'buyer', 'supplier', 'admin', 'transporter', 'pathologist', 'offtaker', 'groups'));

-- Add missing profile columns used by the app
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS district         TEXT,
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================================
-- 2. AUTO-CREATE PROFILE ON SIGN-UP (Postgres trigger)
--    Runs server-side, SECURITY DEFINER bypasses RLS.
--    This eliminates the race condition where the client-side
--    /api/auth/create-profile call could fail before the session is ready.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                        -- runs as postgres, bypasses RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, phone_number, location)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(NEW.email, '@', 1),
      'User'
    ),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
      'farmer'
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'location'), '')
  )
  ON CONFLICT (user_id) DO NOTHING;   -- safe to re-run; idempotent
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger so it's always current
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. PROFILES — ADMIN READ-ALL POLICY
--    Admins need to read all profiles (for admin dashboard, user management).
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 4. PROFILES — SERVICE ROLE UPSERT POLICY
--    Service role bypasses RLS by design; no policy needed.
--    But ensure the server-side upsert in /api/auth/create-profile can work
--    even when called as the user (non-service-role path as fallback).
-- ============================================================================
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;
CREATE POLICY "Users can upsert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. LISTINGS — MISSING ADMIN POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 6. OFFERS — SERVICE ROLE ADMIN POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all offers" ON offers;
CREATE POLICY "Admins can view all offers"
  ON offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 7. ENSURE WALLETS TABLE EXISTS (referenced by API routes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance     DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency    TEXT NOT NULL DEFAULT 'UGX',
  is_frozen   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id),
  CONSTRAINT valid_balance CHECK (balance >= 0)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all wallets" ON wallets;
CREATE POLICY "Admins can manage all wallets"
  ON wallets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================================
-- 8. ENSURE FARM_INVENTORY TABLE EXISTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS farm_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  quantity    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'kg',
  notes       TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE farm_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own inventory" ON farm_inventory;
CREATE POLICY "Users can manage own inventory"
  ON farm_inventory FOR ALL
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all inventory" ON farm_inventory;
CREATE POLICY "Admins can view all inventory"
  ON farm_inventory FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 9. ENSURE DISEASE_CASES TABLE EXISTS (used by pathologist routes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS disease_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES profiles(id),
  crop_type       TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'low'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  location        TEXT,
  image_url       TEXT,
  diagnosis       TEXT,
  treatment_plan  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE disease_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can create and view own cases" ON disease_cases;
CREATE POLICY "Farmers can create and view own cases"
  ON disease_cases FOR ALL
  USING (
    reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Pathologists can view and update cases" ON disease_cases;
CREATE POLICY "Pathologists can view and update cases"
  ON disease_cases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('pathologist', 'admin')
    )
  );

CREATE OR REPLACE TRIGGER update_disease_cases_updated_at
  BEFORE UPDATE ON disease_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. ENSURE FARMER_GROUPS TABLE EXISTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS farmer_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  leader_id   UUID REFERENCES profiles(id),
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active groups" ON farmer_groups;
CREATE POLICY "Anyone can view active groups"
  ON farmer_groups FOR SELECT
  USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Group leaders and admins can manage groups" ON farmer_groups;
CREATE POLICY "Group leaders and admins can manage groups"
  ON farmer_groups FOR ALL
  USING (
    leader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 11. GRANT PERMISSIONS TO SERVICE ROLE FOR ALL TABLES
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant authenticated users access to execute the auto-profile function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_profile() TO service_role;

-- ============================================================================
-- 12. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farm_inventory_profile_id ON farm_inventory(profile_id);
CREATE INDEX IF NOT EXISTS idx_disease_cases_reporter_id ON disease_cases(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disease_cases_assigned_to ON disease_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disease_cases_status ON disease_cases(status);
CREATE INDEX IF NOT EXISTS idx_disease_cases_severity ON disease_cases(severity);
CREATE INDEX IF NOT EXISTS idx_farmer_groups_leader ON farmer_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON wallets(profile_id);
