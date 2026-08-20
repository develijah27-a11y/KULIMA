-- The supabase_realtime publication had zero tables in it — every
-- postgres_changes subscription in the app (GroupChatClient's live message
-- pop-in, NotificationBell's live badge/toast) has been silently inert in
-- production: the client subscribes correctly and RLS allows it, but
-- Postgres never actually publishes the change event because the table was
-- never added to the replication publication in the first place. This is
-- the root cause of "messages don't pop up in group chat" and of the
-- notification bell needing a page reload to show new items.
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
