-- ============================================================
-- System-wide, daily-refreshed "what farmers are buying" cache
-- for the agro-dealer demand page. Computed by a Vercel cron from
-- real supplier_orders (not listings/asking prices), across every
-- dealer's customers, so any dealer can see system-wide trends —
-- not just their own. A cache table rather than computing this
-- aggregate live on every dashboard load, both because it was
-- explicitly asked to refresh daily and because aggregating the
-- whole orders table on every page view doesn't scale.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_demand_insights (
  product_name  TEXT PRIMARY KEY,
  order_count   INTEGER NOT NULL DEFAULT 0,
  total_qty     NUMERIC NOT NULL DEFAULT 0,
  buyer_count   INTEGER NOT NULL DEFAULT 0,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.supplier_demand_insights ENABLE ROW LEVEL SECURITY;

-- Aggregate counts only, no buyer identity — safe for any authenticated
-- user to read. Writes go through the cron's service-role client, which
-- bypasses RLS entirely, so no INSERT/UPDATE policy is needed.
DROP POLICY IF EXISTS "demand_insights_read" ON public.supplier_demand_insights;
CREATE POLICY "demand_insights_read" ON public.supplier_demand_insights
  FOR SELECT USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
