-- delivery_requests.transporter_id and requester_id both reference
-- auth.users(id), not profiles — but 6 pages across buyer/farmer/transporter
-- do a PostgREST embed like `profiles!delivery_requests_transporter_id_fkey(...)`,
-- naming the auth.users FK as the join hint for a *different* table
-- (profiles). PostgREST can't resolve that (confirmed live: the query
-- 400s with "Could not find a relationship between 'delivery_requests' and
-- 'profiles'"), so every one of those pages has been silently returning no
-- driver/requester info — buyer/deliveries and farmer/deliveries appear to
-- show zero deliveries at all, since the whole .select() call fails and the
-- page code doesn't check the error, just falls back to an empty array.
--
-- Fix: add a second, real FK from each column to profiles(user_id) — safe,
-- since profiles.user_id is UNIQUE (profiles_user_id_key) and there are zero
-- orphaned transporter_id/requester_id values today (verified before
-- writing this). Application code is then updated to use these new
-- constraint names as the embed hint.
ALTER TABLE delivery_requests
  ADD CONSTRAINT delivery_requests_transporter_profile_fkey
  FOREIGN KEY (transporter_id) REFERENCES profiles(user_id);

ALTER TABLE delivery_requests
  ADD CONSTRAINT delivery_requests_requester_profile_fkey
  FOREIGN KEY (requester_id) REFERENCES profiles(user_id);
