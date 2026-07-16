-- Buyers browsing /buyer/group-listings currently see only crop/district/
-- member_count — no indication of which farmer group they're actually
-- buying from. Denormalize the group's name onto group_listings at
-- publish time (same pattern as group_messages.sender_name) rather than
-- joining farmer_groups live on every read, since group_listings.admin_id
-- is the leader's auth.uid() and farmer_groups is keyed by leader_id via
-- profiles.id — a live join needs two hops through profiles every time.
ALTER TABLE group_listings ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Backfill existing rows from the group the listing's admin currently leads.
UPDATE group_listings gl
SET group_name = fg.name
FROM profiles p
JOIN farmer_groups fg ON fg.leader_id = p.id
WHERE p.user_id = gl.admin_id
  AND gl.group_name IS NULL;
