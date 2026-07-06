BEGIN;

-- buyer_favourites: wrap auth.uid() for initplan perf
DROP POLICY IF EXISTS buyers_own_favourites ON public.buyer_favourites;
CREATE POLICY buyers_own_favourites ON public.buyer_favourites
  FOR ALL
  USING (buyer_id = (select auth.uid()))
  WITH CHECK (buyer_id = (select auth.uid()));

-- consultations: consolidate 2 ALL policies into 1, wrap auth calls via private.is_admin()
DROP POLICY IF EXISTS admin_consultations ON public.consultations;
DROP POLICY IF EXISTS consultation_parties ON public.consultations;
CREATE POLICY consultations_access ON public.consultations
  FOR ALL
  USING (
    farmer_id = (select auth.uid())
    OR pathologist_id = (select auth.uid())
    OR private.is_admin()
  )
  WITH CHECK (
    farmer_id = (select auth.uid())
    OR pathologist_id = (select auth.uid())
    OR private.is_admin()
  );

-- direct_messages: wrap auth.uid() for initplan perf (no permissive overlap, 3 distinct commands)
DROP POLICY IF EXISTS dm_parties_view ON public.direct_messages;
CREATE POLICY dm_parties_view ON public.direct_messages
  FOR SELECT
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS dm_recipient_mark_read ON public.direct_messages;
CREATE POLICY dm_recipient_mark_read ON public.direct_messages
  FOR UPDATE
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (read = true);

DROP POLICY IF EXISTS dm_sender_insert ON public.direct_messages;
CREATE POLICY dm_sender_insert ON public.direct_messages
  FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));

-- delivery_locations: split ALL policy so only SELECT is combined (fixes multiple_permissive on SELECT)
DROP POLICY IF EXISTS driver_view_assigned_location ON public.delivery_locations;
DROP POLICY IF EXISTS requester_manage_own_location ON public.delivery_locations;

CREATE POLICY delivery_locations_select ON public.delivery_locations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.transporter_id = (select auth.uid()))
    OR (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.requester_id = (select auth.uid())))
  );

CREATE POLICY delivery_locations_insert ON public.delivery_locations
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.requester_id = (select auth.uid()))
  );

CREATE POLICY delivery_locations_update ON public.delivery_locations
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.requester_id = (select auth.uid()))
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.requester_id = (select auth.uid()))
  );

CREATE POLICY delivery_locations_delete ON public.delivery_locations
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id = delivery_locations.delivery_request_id AND dr.requester_id = (select auth.uid()))
  );

-- group_listing_contributions: split admin ALL so only SELECT is combined
DROP POLICY IF EXISTS admin_manage_contributions ON public.group_listing_contributions;
DROP POLICY IF EXISTS member_view_own_contribution ON public.group_listing_contributions;

CREATE POLICY glc_select ON public.group_listing_contributions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = (select auth.uid()))
    OR farmer_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
  );

CREATE POLICY glc_insert ON public.group_listing_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = (select auth.uid()))
  );

CREATE POLICY glc_update ON public.group_listing_contributions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = (select auth.uid()))
  );

CREATE POLICY glc_delete ON public.group_listing_contributions
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM group_listings gl WHERE gl.id = group_listing_contributions.group_listing_id AND gl.admin_id = (select auth.uid()))
  );

-- group_messages: consolidate admin ALL + member_send INSERT + sender_view SELECT
DROP POLICY IF EXISTS group_admin_all_messages ON public.group_messages;
DROP POLICY IF EXISTS group_member_send ON public.group_messages;
DROP POLICY IF EXISTS group_sender_view ON public.group_messages;

CREATE POLICY group_messages_select ON public.group_messages
  FOR SELECT
  USING (admin_id = (select auth.uid()) OR sender_id = (select auth.uid()));

CREATE POLICY group_messages_insert ON public.group_messages
  FOR INSERT
  WITH CHECK (admin_id = (select auth.uid()) OR sender_id = (select auth.uid()));

CREATE POLICY group_messages_update ON public.group_messages
  FOR UPDATE
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY group_messages_delete ON public.group_messages
  FOR DELETE
  USING (admin_id = (select auth.uid()));

-- platform_commission: consolidate admin ALL + service_read SELECT(true)
DROP POLICY IF EXISTS admin_manage_commission ON public.platform_commission;
DROP POLICY IF EXISTS service_read_commission ON public.platform_commission;

CREATE POLICY platform_commission_select ON public.platform_commission
  FOR SELECT
  USING (true);

CREATE POLICY platform_commission_insert ON public.platform_commission
  FOR INSERT
  WITH CHECK (private.is_admin());

CREATE POLICY platform_commission_update ON public.platform_commission
  FOR UPDATE
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY platform_commission_delete ON public.platform_commission
  FOR DELETE
  USING (private.is_admin());

-- schema_migrations: RLS enabled but zero policies (silent full-deny) — document intent explicitly
CREATE POLICY schema_migrations_no_client_access ON public.schema_migrations
  FOR ALL
  USING (false);

-- unindexed_foreign_keys: add covering indexes
CREATE INDEX IF NOT EXISTS idx_buyer_favourites_farmer_id ON public.buyer_favourites(farmer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_disease_report_id ON public.consultations(disease_report_id);
CREATE INDEX IF NOT EXISTS idx_consultations_payment_txn_id ON public.consultations(payment_txn_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_user_id ON public.delivery_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON public.group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_listings_approved_by ON public.listings(approved_by);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_id ON public.orders(escrow_id);
CREATE INDEX IF NOT EXISTS idx_platform_commission_platform_wallet_user_id ON public.platform_commission(platform_wallet_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_commission_updated_by ON public.platform_commission(updated_by);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON public.wallet_transactions(order_id);

COMMIT;
