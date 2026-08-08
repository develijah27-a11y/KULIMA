-- group_messages_select has been silently broken since 20260706042037,
-- which (while consolidating policies for the perf advisor) reverted it to
-- `admin_id = auth.uid() OR sender_id = auth.uid()` — a regular member can
-- only see messages where THEY are the sender, never another member's.
-- group_messages_insert was correctly fixed to require real group
-- membership on 20260714000003 and again on 20260716000005, but nothing
-- ever re-fixed SELECT to match, so group chat has not actually been a
-- shared conversation for members since early July — every member sees
-- only their own messages plus whatever the admin can see.
DROP POLICY IF EXISTS group_messages_select ON public.group_messages;
CREATE POLICY group_messages_select ON public.group_messages
  FOR SELECT
  USING (
    admin_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.admin_id = group_messages.admin_id
        AND gm.farmer_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
    )
  );
