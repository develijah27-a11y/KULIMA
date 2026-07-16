-- Mirrors buyer_favourites (buyer -> farmer) for the farmer -> supplier
-- relationship: a farmer saving an agro-dealer they want to buy inputs
-- from again. Same shape, same RLS pattern.
CREATE TABLE IF NOT EXISTS public.farmer_favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farmer_id, supplier_id)
);

ALTER TABLE public.farmer_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY farmers_own_favourites ON public.farmer_favourites FOR ALL
  USING (farmer_id = (SELECT auth.uid()))
  WITH CHECK (farmer_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_farmer_favourites_farmer ON public.farmer_favourites(farmer_id);

-- supplier_orders_insert only ever allowed a supplier to insert into their
-- own orders (supplier_id = own profile) — there was no path for a farmer
-- to create an order at all, matching zero rows ever having been created.
-- Farmers place orders naming themselves as buyer_id (their own auth uid,
-- matching supplier_orders_select's buyer_id = auth.uid() check and the
-- app-wide buyer_id convention used by offers/orders), not the supplier's.
CREATE POLICY supplier_orders_insert_buyer ON public.supplier_orders FOR INSERT
  WITH CHECK (buyer_id = (SELECT auth.uid()));
