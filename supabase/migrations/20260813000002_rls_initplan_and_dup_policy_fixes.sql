-- Supabase performance advisor: auth_rls_initplan (13 findings) +
-- multiple_permissive_policies (78 findings, 13 distinct table/action combos
-- once deduped across the 6 evaluated roles). Same class of issue a prior
-- migration (20260706042037_security_perf_advisor_fixes.sql) already fixed
-- once, reintroduced by tables built since then (POS Phase 3/4, group loans
-- workflow, offtaker contract offers, subscriptions). Two changes per table:
--   1. Wrap bare auth.<function>() calls in (select auth.<function>()) so
--      Postgres evaluates them once per query (InitPlan) instead of once
--      per row.
--   2. Where two permissive policies covered the same {table, command}, drop
--      both and recreate as a single policy that is the exact OR of the two
--      original conditions -- Postgres already evaluates separate permissive
--      policies as an OR for access purposes, so this is a pure performance
--      rewrite (one policy check instead of two), not an access change.
-- Every USING/WITH CHECK expression below was copied verbatim from the live
-- pg_policies definitions before editing, with only the auth.uid() wrapping
-- and the OR-merge applied.
BEGIN;

-- group_listing_submissions: SELECT and UPDATE each had 2 permissive
-- policies (leader vs member). Already using (select auth.uid()), so this
-- is a pure dedup, no initplan fix needed.
DROP POLICY IF EXISTS leader_view_group_submissions ON public.group_listing_submissions;
DROP POLICY IF EXISTS member_view_own_submission ON public.group_listing_submissions;
CREATE POLICY group_listing_submissions_select ON public.group_listing_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
    OR farmer_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS leader_update_group_submissions ON public.group_listing_submissions;
DROP POLICY IF EXISTS member_update_own_pending_submission ON public.group_listing_submissions;
CREATE POLICY group_listing_submissions_update ON public.group_listing_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
    OR (
      farmer_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
      AND status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farmer_groups fg
      WHERE fg.id = group_listing_submissions.group_id
        AND fg.leader_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
    OR (
      farmer_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
      AND status = ANY (ARRAY['pending', 'withdrawn'])
    )
  );

-- group_loans: "Group admins manage loans" (ALL, admin_id) overlapped with
-- member_apply_own_loan (INSERT) and member_view_own_loan (SELECT); both
-- member policies also had bare auth.uid(). Split ALL into per-command
-- policies merged with the member conditions, same pattern as the delivery
-- locations / group_listing_contributions split in the prior perf migration.
DROP POLICY IF EXISTS "Group admins manage loans" ON public.group_loans;
DROP POLICY IF EXISTS member_apply_own_loan ON public.group_loans;
DROP POLICY IF EXISTS member_view_own_loan ON public.group_loans;

CREATE POLICY group_loans_select ON public.group_loans
  FOR SELECT
  USING (
    admin_id = (select auth.uid())
    OR borrower_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
  );

CREATE POLICY group_loans_insert ON public.group_loans
  FOR INSERT
  WITH CHECK (
    admin_id = (select auth.uid())
    OR (
      borrower_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
      AND EXISTS (SELECT 1 FROM farmer_group_members fgm WHERE fgm.group_id = group_loans.group_id AND fgm.farmer_id = group_loans.borrower_id)
    )
  );

CREATE POLICY group_loans_update ON public.group_loans
  FOR UPDATE
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY group_loans_delete ON public.group_loans
  FOR DELETE
  USING (admin_id = (select auth.uid()));

-- listings: SELECT had 2 permissive policies (admin/own-listing vs
-- buyer-sees-active). Already wrapped, pure dedup.
DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
DROP POLICY IF EXISTS "Buyers can view active listings" ON public.listings;
CREATE POLICY listings_select ON public.listings
  FOR SELECT
  USING (
    farmer_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    OR private.is_admin()
    OR status = 'active'
  );

-- loan_profiles: the two SELECT policies were identical duplicates.
DROP POLICY IF EXISTS "Users view own loan profile" ON public.loan_profiles;
DROP POLICY IF EXISTS farmers_read_own_loan_profile ON public.loan_profiles;
CREATE POLICY loan_profiles_select ON public.loan_profiles
  FOR SELECT
  USING (farmer_id = ((select auth.uid()))::text);

-- mobile_money_requests: users_read_own_momo (user_id = auth.uid()) was a
-- strict subset of rls_select (admin OR user_id = auth.uid()) -- just drop
-- the redundant one, rls_select already covers it and is already wrapped.
DROP POLICY IF EXISTS users_read_own_momo ON public.mobile_money_requests;

-- offers: SELECT had 2 permissive policies (admin-view-all vs
-- buyer/farmer-view-own). Already wrapped, pure dedup.
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
DROP POLICY IF EXISTS "Buyers and farmers can view their own offers" ON public.offers;
CREATE POLICY offers_select ON public.offers
  FOR SELECT
  USING (
    private.is_admin()
    OR buyer_id = (select auth.uid())
    OR listing_id IN (
      SELECT listings.id FROM listings
      WHERE listings.farmer_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
  );

-- offtaker_contract_offers: SELECT had 2 permissive policies, both with
-- bare auth.uid() -- merge + wrap in one pass.
DROP POLICY IF EXISTS farmer_view_own_offers ON public.offtaker_contract_offers;
DROP POLICY IF EXISTS offtaker_view_own_contract_offers ON public.offtaker_contract_offers;
CREATE POLICY offtaker_contract_offers_select ON public.offtaker_contract_offers
  FOR SELECT
  USING (
    farmer_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM offtaker_contracts oc
      WHERE oc.id = offtaker_contract_offers.contract_id AND oc.offtaker_id = (select auth.uid())
    )
  );

-- pos_purchase_order_items / pos_purchase_orders / pos_sale_items /
-- pos_sales / stores: single owner-scoped ALL policy each, no dup, just a
-- bare auth.uid() left over from the Phase 3 POS migration -- wrap in place.
ALTER POLICY owner_all_pos_po_items ON public.pos_purchase_order_items
  USING (
    purchase_order_id IN (
      SELECT pos_purchase_orders.id FROM pos_purchase_orders
      WHERE pos_purchase_orders.supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
  );

ALTER POLICY owner_all_pos_po ON public.pos_purchase_orders
  USING (supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

ALTER POLICY owner_all_pos_sale_items ON public.pos_sale_items
  USING (
    pos_sale_id IN (
      SELECT pos_sales.id FROM pos_sales
      WHERE pos_sales.supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    )
  );

ALTER POLICY owner_all_pos_sales ON public.pos_sales
  USING (supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

ALTER POLICY owner_all_stores ON public.stores
  USING (supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

-- pos_staff: owner_manage_staff (ALL, owner_id) overlapped with
-- staff_reads_own_row (SELECT, user_id); both had bare auth.uid(). Split
-- into per-command policies same as group_loans above.
DROP POLICY IF EXISTS owner_manage_staff ON public.pos_staff;
DROP POLICY IF EXISTS staff_reads_own_row ON public.pos_staff;

CREATE POLICY pos_staff_select ON public.pos_staff
  FOR SELECT
  USING (
    owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    OR user_id = (select auth.uid())
  );

CREATE POLICY pos_staff_insert ON public.pos_staff
  FOR INSERT
  WITH CHECK (owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

CREATE POLICY pos_staff_update ON public.pos_staff
  FOR UPDATE
  USING (owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())))
  WITH CHECK (owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

CREATE POLICY pos_staff_delete ON public.pos_staff
  FOR DELETE
  USING (owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid())));

-- subscriptions: admins_manage_subscriptions (ALL) overlapped with
-- users_own_subscriptions (SELECT); both had bare auth.uid(). Split same as
-- above -- regular users keep SELECT-only, insert/update/delete stay
-- admin-only exactly as before.
DROP POLICY IF EXISTS admins_manage_subscriptions ON public.subscriptions;
DROP POLICY IF EXISTS users_own_subscriptions ON public.subscriptions;

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin')
    OR user_id = (select auth.uid())
  );

CREATE POLICY subscriptions_insert ON public.subscriptions
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY subscriptions_update ON public.subscriptions
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY subscriptions_delete ON public.subscriptions
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'));

-- supplier_orders: INSERT had 2 permissive policies (supplier vs buyer
-- creating an order). Already wrapped, pure dedup.
DROP POLICY IF EXISTS supplier_orders_insert ON public.supplier_orders;
DROP POLICY IF EXISTS supplier_orders_insert_buyer ON public.supplier_orders;
CREATE POLICY supplier_orders_insert ON public.supplier_orders
  FOR INSERT
  WITH CHECK (
    supplier_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = (select auth.uid()))
    OR buyer_id = (select auth.uid())
  );

-- wallets: users_read_own_wallet (user_id = auth.uid()) was a strict subset
-- of rls_select (admin OR user_id = auth.uid()) -- drop the redundant one.
DROP POLICY IF EXISTS users_read_own_wallet ON public.wallets;

COMMIT;
