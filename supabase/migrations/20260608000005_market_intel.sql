-- ============================================================================
-- MARKET INTELLIGENCE — District Prices, Demand Signals, Planting Alerts
-- ============================================================================

-- 1. Add district and source to market_prices
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source   TEXT NOT NULL DEFAULT 'admin'
  CHECK (source IN ('admin', 'transaction', 'aggregated', 'system'));

CREATE INDEX IF NOT EXISTS idx_prices_district ON market_prices(district);
CREATE INDEX IF NOT EXISTS idx_prices_crop_district ON market_prices(crop_type, district);
CREATE INDEX IF NOT EXISTS idx_prices_recorded ON market_prices(recorded_at DESC);

-- 2. Planting alerts table (per-farmer alerts)
CREATE TABLE IF NOT EXISTS planting_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop         TEXT NOT NULL,
  alert_type   TEXT NOT NULL CHECK (alert_type IN ('plant_now','plant_soon','harvest_now','harvest_soon','prepare','disease','weather')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  urgency      TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high','medium','low')),
  season       TEXT,
  scheduled_for DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planting_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_alerts" ON planting_alerts FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_plant_alerts_user ON planting_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_plant_alerts_date ON planting_alerts(scheduled_for DESC);

-- 3. Crop demand view (derived from offers + listings — no extra table)
-- Use via: SELECT * FROM crop_demand_signals
CREATE OR REPLACE VIEW crop_demand_signals AS
SELECT
  l.crop_type,
  COUNT(o.id)                                       AS offer_count_30d,
  ROUND(AVG(o.offered_price)::numeric, 0)           AS avg_offered_price,
  ROUND(AVG(l.asking_price)::numeric, 0)            AS avg_asking_price,
  ROUND(
    (COUNT(o.id)::float / GREATEST(1, COUNT(DISTINCT l.id)::float))::numeric
  , 2)                                              AS bids_per_listing,
  MAX(o.created_at)                                 AS latest_offer_at
FROM listings l
LEFT JOIN offers o ON o.listing_id = l.id
  AND o.created_at > NOW() - INTERVAL '30 days'
WHERE l.status = 'active'
GROUP BY l.crop_type
ORDER BY offer_count_30d DESC;

-- 4. Seed market prices for all major districts (June 2026 baseline)
-- Central Uganda
INSERT INTO market_prices (crop_type, price_per_kg, market_name, district, source, recorded_at) VALUES
('maize',        650,  'Nakasero Market',    'Kampala',   'system', NOW()),
('beans',        3200, 'Nakasero Market',    'Kampala',   'system', NOW()),
('groundnuts',   4500, 'Nakasero Market',    'Kampala',   'system', NOW()),
('sorghum',      750,  'Nakasero Market',    'Kampala',   'system', NOW()),
('cassava',      550,  'Nakasero Market',    'Kampala',   'system', NOW()),
('sweet_potatoes',450, 'Nakasero Market',    'Kampala',   'system', NOW()),
('banana',       650,  'Nakasero Market',    'Kampala',   'system', NOW()),
('tomato',       1200, 'Nakasero Market',    'Kampala',   'system', NOW()),
('coffee',       5800, 'Kampala Produce',    'Kampala',   'system', NOW()),
('sunflower',    1800, 'Kampala Produce',    'Kampala',   'system', NOW()),
('rice',         3000, 'Nakasero Market',    'Kampala',   'system', NOW()),
-- Wakiso
('maize',        600,  'Kasangati Market',   'Wakiso',    'system', NOW()),
('beans',        3000, 'Kasangati Market',   'Wakiso',    'system', NOW()),
('banana',       600,  'Kasangati Market',   'Wakiso',    'system', NOW()),
('tomato',       1100, 'Kasangati Market',   'Wakiso',    'system', NOW()),
-- Eastern
('maize',        580,  'Jinja Produce',      'Jinja',     'system', NOW()),
('beans',        2900, 'Jinja Produce',      'Jinja',     'system', NOW()),
('groundnuts',   4200, 'Jinja Produce',      'Jinja',     'system', NOW()),
('rice',         2800, 'Jinja Produce',      'Jinja',     'system', NOW()),
('maize',        560,  'Mbale Market',       'Mbale',     'system', NOW()),
('beans',        2800, 'Mbale Market',       'Mbale',     'system', NOW()),
('coffee',       5500, 'Mbale Arabica Coop', 'Mbale',     'system', NOW()),
('maize',        520,  'Soroti Market',      'Soroti',    'system', NOW()),
('sorghum',      680,  'Soroti Market',      'Soroti',    'system', NOW()),
('groundnuts',   4000, 'Soroti Market',      'Soroti',    'system', NOW()),
-- Northern
('maize',        540,  'Gulu Market',        'Gulu',      'system', NOW()),
('sorghum',      700,  'Gulu Market',        'Gulu',      'system', NOW()),
('groundnuts',   3800, 'Gulu Market',        'Gulu',      'system', NOW()),
('maize',        510,  'Lira Market',        'Lira',      'system', NOW()),
('sorghum',      660,  'Lira Market',        'Lira',      'system', NOW()),
('sweet_potatoes',380, 'Lira Market',        'Lira',      'system', NOW()),
-- Western
('beans',        2600, 'Mbarara Market',     'Mbarara',   'system', NOW()),
('banana',       550,  'Mbarara Market',     'Mbarara',   'system', NOW()),
('cassava',      480,  'Mbarara Market',     'Mbarara',   'system', NOW()),
('tomato',       900,  'Mbarara Market',     'Mbarara',   'system', NOW()),
('beans',        2500, 'Kabale Market',      'Kabale',    'system', NOW()),
('sweet_potatoes',420, 'Kabale Market',      'Kabale',    'system', NOW()),
('coffee',       6200, 'Kabale Arabica',     'Kabale',    'system', NOW()),
('coffee',       6500, 'Fort Portal Coop',   'Fort Portal','system', NOW()),
('banana',       700,  'Fort Portal Market', 'Fort Portal','system', NOW()),
('beans',        2700, 'Fort Portal Market', 'Fort Portal','system', NOW()),
-- Masaka
('maize',        630,  'Masaka Market',      'Masaka',    'system', NOW()),
('beans',        3100, 'Masaka Market',      'Masaka',    'system', NOW()),
('coffee',       5600, 'Masaka Robusta',     'Masaka',    'system', NOW()),
('banana',       580,  'Masaka Market',      'Masaka',    'system', NOW())
ON CONFLICT DO NOTHING;

-- 5. Ensure RLS allows admin to insert market prices
DROP POLICY IF EXISTS "admin_insert_prices" ON market_prices;
CREATE POLICY "admin_insert_prices" ON market_prices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "admin_update_prices" ON market_prices;
CREATE POLICY "admin_update_prices" ON market_prices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "public_view_prices" ON market_prices;
CREATE POLICY "public_view_prices" ON market_prices FOR SELECT USING (true);
