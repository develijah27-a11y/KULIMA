-- group_listing_submissions — lets an individual (real, authenticated) group
-- member submit their own produce contribution for a future collective sale,
-- without requiring a photo (unlike the individual marketplace listing flow).
-- The group leader then reviews submissions auto-clustered by crop type and
-- publishes a group_listings lot with one click, instead of hand-typing every
-- member's kg into the create-listing form.
--
-- Keyed off farmer_groups / farmer_group_members (the real, auth-linked
-- membership system used by /farmer/groups) rather than the separate
-- admin-only `group_members` bookkeeping table used elsewhere under
-- /groups/* — only farmer_group_members ties a submission to an actual
-- logged-in farmer who can be paid out via group_listing_contributions.
CREATE TABLE IF NOT EXISTS group_listing_submissions (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID          NOT NULL REFERENCES farmer_groups(id) ON DELETE CASCADE,
  farmer_id    UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crop_type    TEXT          NOT NULL,
  quantity_kg  DECIMAL(10,2) NOT NULL CHECK (quantity_kg > 0),
  notes        TEXT,
  photo_url    TEXT,
  status       TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'withdrawn')),
  group_listing_id UUID      REFERENCES group_listings(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE group_listing_submissions ENABLE ROW LEVEL SECURITY;

-- Member: submit + manage their own submissions.
CREATE POLICY "member_insert_own_submission" ON group_listing_submissions FOR INSERT
  WITH CHECK (
    farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM farmer_group_members fgm
      WHERE fgm.group_id = group_listing_submissions.group_id
        AND fgm.farmer_id = group_listing_submissions.farmer_id
    )
  );

CREATE POLICY "member_view_own_submission" ON group_listing_submissions FOR SELECT
  USING (farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- A member can only withdraw/edit their own submission while it's still
-- pending — once a leader has published it into a real listing it's locked.
CREATE POLICY "member_update_own_pending_submission" ON group_listing_submissions FOR UPDATE
  USING (
    farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND status IN ('pending', 'withdrawn')
  );

CREATE POLICY "member_delete_own_pending_submission" ON group_listing_submissions FOR DELETE
  USING (
    farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- Leader: view + organize/publish all submissions for the group they lead.
CREATE POLICY "leader_view_group_submissions" ON group_listing_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "leader_update_group_submissions" ON group_listing_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_gls_group_status ON group_listing_submissions(group_id, status);
CREATE INDEX IF NOT EXISTS idx_gls_farmer       ON group_listing_submissions(farmer_id);

DROP TRIGGER IF EXISTS update_group_listing_submissions_at ON group_listing_submissions;
CREATE TRIGGER update_group_listing_submissions_at BEFORE UPDATE ON group_listing_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON group_listing_submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_listing_submissions TO authenticated;
