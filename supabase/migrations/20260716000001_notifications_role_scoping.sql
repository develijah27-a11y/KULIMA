-- Notifications are keyed only by user_id (the shared auth account id), with
-- no awareness of which role dashboard they were meant for. Since one
-- account can hold several roles (profiles.roles[]) and switch between
-- dashboards, a delivery notification meant for someone's farmer identity
-- was showing up in their buyer/transporter bell too, and vice versa.
--
-- `role` is nullable and additive: existing rows and any insert that never
-- sets it stay NULL, which the read side treats as "show on every dashboard
-- this account can reach" (system/security/admin-broadcast notices that
-- aren't tied to one role). Only the role-specific notifications need it set.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS role TEXT;
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON public.notifications(user_id, role);
