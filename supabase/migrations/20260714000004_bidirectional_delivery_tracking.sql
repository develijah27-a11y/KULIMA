-- Delivery location sharing was one-directional (requester -> driver only).
-- The new driver-tracking UI needs the reverse too: the assigned transporter
-- broadcasts their own position, and the requester (buyer/farmer) reads it.
-- The table already supports multiple rows per delivery (one per user_id via
-- the delivery_request_id+user_id unique key) — only the RLS policies were
-- one-directional. Widen them symmetrically.

DROP POLICY IF EXISTS delivery_locations_select ON public.delivery_locations;
CREATE POLICY delivery_locations_select ON public.delivery_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id
      AND (dr.transporter_id = (select auth.uid()) OR dr.requester_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS delivery_locations_insert ON public.delivery_locations;
CREATE POLICY delivery_locations_insert ON public.delivery_locations
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id
      AND (dr.requester_id = (select auth.uid()) OR dr.transporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS delivery_locations_update ON public.delivery_locations;
CREATE POLICY delivery_locations_update ON public.delivery_locations
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id
      AND (dr.requester_id = (select auth.uid()) OR dr.transporter_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id
      AND (dr.requester_id = (select auth.uid()) OR dr.transporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS delivery_locations_delete ON public.delivery_locations;
CREATE POLICY delivery_locations_delete ON public.delivery_locations
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id
      AND (dr.requester_id = (select auth.uid()) OR dr.transporter_id = (select auth.uid()))
    )
  );
