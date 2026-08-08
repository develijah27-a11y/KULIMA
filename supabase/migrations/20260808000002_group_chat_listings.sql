-- "Send Listing" from inside group chat — a member taps a button in their
-- group's chat, picks a crop + quantity, and it lands here rather than as
-- free-text in the message stream. Scoped to the same admin_id/group_members
-- roster the chat already uses (System A), not farmer_group_members (the
-- separate self-serve /farmer/groups system) — the two group systems key
-- membership differently and aren't bridged, so this stays consistent with
-- whichever roster the chat's own RLS already trusts.
CREATE TABLE IF NOT EXISTS group_chat_listings (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID          NOT NULL,          -- chat room identifier, same as group_messages
  sender_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name  TEXT,
  crop_type    TEXT          NOT NULL,
  quantity_kg  DECIMAL(10,2) NOT NULL CHECK (quantity_kg > 0),
  notes        TEXT,
  status       TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','organized')),
  message_id   UUID          REFERENCES group_messages(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE group_chat_listings ENABLE ROW LEVEL SECURITY;

-- Same visibility rule as the group_messages_select fix: the admin, or any
-- member on their group_members roster with a linked real account.
CREATE POLICY group_chat_listings_select ON group_chat_listings
  FOR SELECT
  USING (
    admin_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.admin_id = group_chat_listings.admin_id
        AND gm.farmer_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
    )
  );

CREATE POLICY group_chat_listings_insert ON group_chat_listings
  FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid())
    AND (
      admin_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.admin_id = group_chat_listings.admin_id
          AND gm.farmer_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
      )
    )
  );

-- Only the group admin can mark listings organized (after clustering/publishing).
CREATE POLICY group_chat_listings_update ON group_chat_listings
  FOR UPDATE
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_group_chat_listings_room ON group_chat_listings(admin_id, status, crop_type);

GRANT ALL ON group_chat_listings TO service_role;
GRANT SELECT, INSERT, UPDATE ON group_chat_listings TO authenticated;
