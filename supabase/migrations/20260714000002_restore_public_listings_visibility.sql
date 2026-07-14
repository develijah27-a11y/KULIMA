-- 20260613000000_rls_perf_fix.sql dropped "rls_select" on public.listings,
-- believing "Admins can view all listings" (farmer_id-owner OR admin) already
-- covered everything. It didn't: that left NO policy letting a buyer view any
-- listing that isn't their own, silently breaking the entire marketplace —
-- browse still showed a buyer's own listings (if any) but every listing
-- detail page for another farmer's listing 404'd.
CREATE POLICY "Buyers can view active listings"
  ON public.listings FOR SELECT
  USING (status = 'active');

-- Same migration left public.offers SELECT-able by admins only ("Admins can
-- view all offers" USING (is_admin())) with no fallback for the buyer who
-- made the offer or the farmer whose listing it's on — so a buyer's own
-- offer, and a farmer's incoming offers on their own listings, were both
-- invisible to everyone except an admin. Mirrors the existing UPDATE policy,
-- which already correctly scopes to buyer-own-offer OR farmer-owns-listing.
CREATE POLICY "Buyers and farmers can view their own offers"
  ON public.offers FOR SELECT
  USING (
    buyer_id = (SELECT auth.uid())
    OR listing_id IN (
      SELECT id FROM public.listings WHERE farmer_id IN (
        SELECT id FROM public.profiles WHERE user_id = (SELECT auth.uid())
      )
    )
  );
