-- group_listing_contributions — per-member kg breakdown for a group listing,
-- used by releaseEscrowForOrder() (src/lib/orders/escrow.ts) to split a group
-- sale's proceeds proportionally across the farmers who actually contributed
-- produce, instead of dumping the whole payout into the pooled group wallet.
--
-- This table has existed on the live database since the group-listings
-- feature shipped (applied directly, never captured in a migration — the
-- same class of undocumented schema drift documented in docs/PROVENANCE.md
-- for delivery_locations). Backfilling it now, using CREATE TABLE IF NOT
-- EXISTS, so it's a no-op against the live DB but makes a fresh environment
-- built from migrations alone actually have this table — without it, group
-- listing creation with per-member contributions fails silently and every
-- group sale falls back to the pooled-wallet payout, even when contributors
-- were recorded.
CREATE TABLE IF NOT EXISTS group_listing_contributions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_listing_id UUID          NOT NULL REFERENCES group_listings(id) ON DELETE CASCADE,
  farmer_id        UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity_kg      DECIMAL(10,2) NOT NULL CHECK (quantity_kg > 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (group_listing_id, farmer_id)
);

ALTER TABLE group_listing_contributions ENABLE ROW LEVEL SECURITY;

-- Verified against the live database (via the Management API) that
-- production already has the *final* consolidated policy set from
-- 20260706042037_security_perf_advisor_fixes.sql (glc_select/insert/
-- update/delete) — the original out-of-band setup evidently used exactly
-- the "admin_manage_contributions" + "member_view_own_contribution" names
-- that migration expects to find and drop, and that migration has already
-- run there. So: only create the original two-policy shape when the later
-- consolidated policies don't already exist (i.e. a fresh install replaying
-- migrations in order, where 20260706042037 hasn't run yet). On production,
-- this whole block is a no-op — creating them there would just resurrect the
-- redundant pre-consolidation policies that migration was written to remove.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'group_listing_contributions' AND policyname = 'glc_select'
  ) THEN
    CREATE POLICY "admin_manage_contributions" ON group_listing_contributions FOR ALL
      USING (
        EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = auth.uid())
      );

    CREATE POLICY "member_view_own_contribution" ON group_listing_contributions FOR SELECT
      USING (
        farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Named to match what's already live (verified via pg_indexes), not the
-- migration's own naming convention — so this stays a true no-op on
-- production instead of creating a second, redundant duplicate index.
CREATE INDEX IF NOT EXISTS idx_glc_listing ON group_listing_contributions(group_listing_id);
CREATE INDEX IF NOT EXISTS idx_glc_farmer  ON group_listing_contributions(farmer_id);

GRANT ALL ON group_listing_contributions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_listing_contributions TO authenticated;
