-- farmer_group_members previously enforced "one group per farmer" via a
-- hard UNIQUE(farmer_id) constraint — a farmer could never join a second
-- group even in their own district. Product decision: a farmer should be
-- able to belong to multiple farmer groups, as long as each one is in the
-- district they actually live in (that same-district check already lives
-- in application code on /api/groups/join, /api/groups/[id]/members, and
-- /api/group-members — unaffected by this migration).
--
-- (This table itself has never had a migration file — same undocumented
-- schema-drift pattern as group_listing_contributions. Backfilling its
-- CREATE TABLE here too, minus the constraint being dropped, so a fresh
-- install ends up in the same final state as production after this runs.)
CREATE TABLE IF NOT EXISTS farmer_group_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES farmer_groups(id) ON DELETE CASCADE,
  farmer_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'secretary', 'treasurer', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, farmer_id)
);

ALTER TABLE farmer_group_members DROP CONSTRAINT IF EXISTS farmer_group_members_farmer_id_unique;

ALTER TABLE farmer_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmer_group_members' AND policyname = 'farmer_group_members_select') THEN
    CREATE POLICY "farmer_group_members_select" ON farmer_group_members FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM farmer_groups fg WHERE fg.id = farmer_group_members.group_id AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
        OR EXISTS (SELECT 1 FROM farmer_group_members m2 WHERE m2.group_id = farmer_group_members.group_id AND m2.farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
      );

    CREATE POLICY "farmer_group_members_insert" ON farmer_group_members FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM farmer_groups fg WHERE fg.id = farmer_group_members.group_id AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
        OR farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      );

    CREATE POLICY "farmer_group_members_update" ON farmer_group_members FOR UPDATE
      USING (EXISTS (SELECT 1 FROM farmer_groups fg WHERE fg.id = farmer_group_members.group_id AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid())));
  END IF;
END $$;

-- Fixed unconditionally (not guarded like the three above): the live
-- "farmer_group_members_delete" policy only lets the group LEADER delete a
-- row, with no clause letting a member delete their own — so /api/groups/
-- leave's self-delete silently matched zero rows under RLS. The UI showed
-- "left" (optimistic client state), but the membership row never actually
-- went away, permanently blocking that farmer from joining anywhere else
-- while the one-group-per-farmer constraint was still in effect. Replacing
-- with a version that also allows a non-leader deleting their own row —
-- leaders still can't self-remove this way (they must transfer leadership
-- first), matching what the API route already checks before calling delete.
DROP POLICY IF EXISTS "farmer_group_members_delete" ON farmer_group_members;
CREATE POLICY "farmer_group_members_delete" ON farmer_group_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM farmer_groups fg WHERE fg.id = farmer_group_members.group_id AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR (farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND role <> 'leader')
  );

CREATE INDEX IF NOT EXISTS idx_fgm_group  ON farmer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_fgm_farmer ON farmer_group_members(farmer_id);

GRANT ALL ON farmer_group_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON farmer_group_members TO authenticated;
