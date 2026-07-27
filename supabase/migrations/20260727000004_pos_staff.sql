-- ============================================================================
-- KULIMA — POS staff sub-accounts (Phase 4 of the approved POS + subscriptions plan)
-- Real Supabase auth sub-accounts (created via auth.admin.createUser from
-- the API layer, not by this migration) for cashiers/store staff, isolated
-- from the 7 marketplace roles by a dedicated 'pos_staff' role value that
-- never enters RoleSwitcher/TopBar's SELF_ADD_ROLES lists or
-- /onboarding/role — every existing dashboard layout guard already rejects
-- any role it doesn't explicitly check for, so this isolation is free.
-- Gated to Business/Enterprise supplier tier at the API layer (getEffectiveTier),
-- not by a DB constraint — tier is a moving/renewable concept, not a fact
-- worth freezing into a CHECK.
-- Safe to re-run.
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_profile_role;
  ALTER TABLE profiles ADD CONSTRAINT valid_profile_role
    CHECK (role = ANY (ARRAY['pending','farmer','buyer','supplier','admin','transporter','pathologist','offtaker','groups','pos_staff']));

  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_profile_roles;
  ALTER TABLE profiles ADD CONSTRAINT valid_profile_roles
    CHECK (roles <@ ARRAY['pending','farmer','buyer','supplier','admin','transporter','pathologist','offtaker','groups','pos_staff']);
END $$;

CREATE TABLE IF NOT EXISTS pos_staff (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id             UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  phone                TEXT,
  permissions          TEXT[] NOT NULL DEFAULT ARRAY['checkout'],
  is_active            BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at          TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_staff_permissions_check') THEN
    ALTER TABLE pos_staff ADD CONSTRAINT pos_staff_permissions_check
      CHECK (permissions <@ ARRAY['checkout','refund','discount','view_reports','manage_inventory']);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_staff_owner ON pos_staff(owner_id);
CREATE INDEX IF NOT EXISTS idx_pos_staff_store ON pos_staff(store_id);

ALTER TABLE pos_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_manage_staff" ON pos_staff;
CREATE POLICY "owner_manage_staff" ON pos_staff FOR ALL USING (
  owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "staff_reads_own_row" ON pos_staff;
CREATE POLICY "staff_reads_own_row" ON pos_staff FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "service_role_all_pos_staff" ON pos_staff;
CREATE POLICY "service_role_all_pos_staff" ON pos_staff FOR ALL TO service_role USING (true);

-- pos_sales.staff_id was left as a bare UUID in the Phase 3 migration
-- (pos_staff didn't exist yet) — attach the real FK now.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_sales_staff_id_fkey') THEN
    ALTER TABLE pos_sales
      ADD CONSTRAINT pos_sales_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES pos_staff(id) ON DELETE SET NULL;
  END IF;
END $$;
