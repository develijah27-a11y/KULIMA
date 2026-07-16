-- Lets each agro-dealer define what "low stock" means per product, instead
-- of the cron job (/api/cron/alerts) applying one hardcoded threshold
-- (stock_qty < 5) to every product regardless of type — a bag of seed and
-- a piece of equipment don't run low at the same quantity.
-- Nullable and additive: NULL keeps the existing hardcoded-5 fallback.
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS low_stock_threshold numeric;
