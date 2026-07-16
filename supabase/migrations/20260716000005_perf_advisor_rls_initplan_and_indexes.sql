-- Supabase performance advisor: auth_rls_initplan — these 13 policies called
-- auth.uid() directly, which re-evaluates it once per row scanned instead of
-- once per query. Wrapping in (select auth.uid()) lets Postgres evaluate it
-- once and reuse the result (InitPlan), which is what the advisor flags as
-- missing. Pure performance rewrite — the access logic is unchanged.
ALTER POLICY "farmer_group_members_delete" ON public.farmer_group_members
  USING (((EXISTS ( SELECT 1
   FROM farmer_groups fg
  WHERE ((fg.id = farmer_group_members.group_id) AND (fg.leader_id = ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = (select auth.uid()))))))) OR ((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))) AND (role <> 'leader'::text))));

ALTER POLICY "leader_update_group_submissions" ON public.group_listing_submissions
  USING ((EXISTS ( SELECT 1
   FROM farmer_groups fg
  WHERE ((fg.id = group_listing_submissions.group_id) AND (fg.leader_id = ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = (select auth.uid()))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM farmer_groups fg
  WHERE ((fg.id = group_listing_submissions.group_id) AND (fg.leader_id = ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = (select auth.uid()))))))));

ALTER POLICY "leader_view_group_submissions" ON public.group_listing_submissions
  USING ((EXISTS ( SELECT 1
   FROM farmer_groups fg
  WHERE ((fg.id = group_listing_submissions.group_id) AND (fg.leader_id = ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = (select auth.uid()))))))));

ALTER POLICY "member_delete_own_pending_submission" ON public.group_listing_submissions
  USING (((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))) AND (status = 'pending'::text)));

ALTER POLICY "member_insert_own_submission" ON public.group_listing_submissions
  WITH CHECK (((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))) AND (EXISTS ( SELECT 1
   FROM farmer_group_members fgm
  WHERE ((fgm.group_id = group_listing_submissions.group_id) AND (fgm.farmer_id = group_listing_submissions.farmer_id))))));

ALTER POLICY "member_update_own_pending_submission" ON public.group_listing_submissions
  USING (((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))) AND (status = 'pending'::text)))
  WITH CHECK (((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))) AND (status = ANY (ARRAY['pending'::text, 'withdrawn'::text]))));

ALTER POLICY "member_view_own_submission" ON public.group_listing_submissions
  USING ((farmer_id = ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = (select auth.uid())))));

ALTER POLICY "group_messages_insert" ON public.group_messages
  WITH CHECK (((sender_id = (select auth.uid())) AND ((admin_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM group_members gm
  WHERE ((gm.admin_id = group_messages.admin_id) AND (gm.farmer_id IN ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = (select auth.uid()))))))))));

ALTER POLICY "farmers_read_own_loan_profile" ON public.loan_profiles
  USING ((farmer_id = ((select auth.uid()))::text));

ALTER POLICY "users_read_own_momo" ON public.mobile_money_requests
  USING ((user_id = (select auth.uid())));

ALTER POLICY "rls_insert" ON public.verifications
  WITH CHECK (((user_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY "admin_update_wallets" ON public.wallets
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

ALTER POLICY "users_read_own_wallet" ON public.wallets
  USING ((user_id = (select auth.uid())));

-- unindexed_foreign_keys — two FKs added this week (farmer_favourites,
-- group_listing_submissions) had no covering index yet.
CREATE INDEX IF NOT EXISTS idx_farmer_favourites_supplier ON public.farmer_favourites(supplier_id);
CREATE INDEX IF NOT EXISTS idx_gls_group_listing_id ON public.group_listing_submissions(group_listing_id);
