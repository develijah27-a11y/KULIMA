-- The existing source CHECK constraint only allowed
-- ('admin','transaction','aggregated','system') — but the daily
-- world-market price cron (/api/cron/prices) has always inserted
-- 'alphavantage' / 'world-bank' / 'cropify-farmers', none of which are in
-- that list. Every insert from that cron has been silently rejected since
-- this constraint was added: market_prices had 48 rows total, all
-- source='system', newest dated over a month ago. Widening the constraint
-- to cover what the app actually writes, plus 'wfp-uganda' for the new
-- Uganda district price ingestion cron.
ALTER TABLE market_prices DROP CONSTRAINT IF EXISTS market_prices_source_check;
ALTER TABLE market_prices ADD CONSTRAINT market_prices_source_check
  CHECK (source = ANY (ARRAY[
    'admin', 'transaction', 'aggregated', 'system',
    'alphavantage', 'world-bank', 'cropify-farmers', 'wfp-uganda'
  ]::text[]));
