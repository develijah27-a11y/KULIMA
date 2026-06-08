-- ============================================================================
-- CASH CROP PRICES — Uganda, East Africa, and Global market reference prices
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_crop_prices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_key     TEXT        NOT NULL,                        -- e.g. 'coffee_robusta'
  crop_name    TEXT        NOT NULL,                        -- display name
  crop_emoji   TEXT        NOT NULL DEFAULT '🌾',
  region       TEXT        NOT NULL DEFAULT 'uganda',       -- uganda | east_africa | global
  market_level TEXT        NOT NULL DEFAULT 'farm_gate',    -- farm_gate | local | export | international
  market_label TEXT        NOT NULL DEFAULT 'Farm Gate',    -- human-readable market level
  price_ugx    NUMERIC(14,2),                               -- price in UGX
  price_usd    NUMERIC(10,4),                               -- price in USD
  price_per    TEXT        NOT NULL DEFAULT 'kg',           -- kg | mt | bag | lb | ton
  price_source TEXT        NOT NULL DEFAULT 'MAAIF',        -- source authority
  category     TEXT        NOT NULL DEFAULT 'cash_crop',    -- cash_crop | food_crop | export
  trend_pct    NUMERIC(6,2) DEFAULT 0,                      -- % change vs last period
  notes        TEXT,
  is_active    BOOLEAN     DEFAULT true,
  updated_by   UUID        REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_crop_prices ENABLE ROW LEVEL SECURITY;
-- Public read (prices are public info)
CREATE POLICY "public_read_cash_prices"  ON cash_crop_prices FOR SELECT USING (true);
-- Only service role / admin writes
CREATE POLICY "service_write_cash_prices" ON cash_crop_prices FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_cash_prices_region   ON cash_crop_prices(region, is_active);
CREATE INDEX IF NOT EXISTS idx_cash_prices_crop     ON cash_crop_prices(crop_key);
CREATE INDEX IF NOT EXISTS idx_cash_prices_updated  ON cash_crop_prices(updated_at DESC);

-- ============================================================================
-- SEED — Uganda cash crops (farm gate & export prices, June 2026)
-- ============================================================================

INSERT INTO cash_crop_prices (crop_key, crop_name, crop_emoji, region, market_level, market_label, price_ugx, price_usd, price_per, price_source, category, trend_pct, notes) VALUES

-- ── UGANDA COFFEE ──
('coffee_robusta',  'Coffee Robusta (FAQ)',      '☕', 'uganda', 'farm_gate',    'Farm Gate',    8200,    2.15,  'kg',  'UCDA',   'cash_crop', 4.2,  'Fair Average Quality. Main season Sep–Feb'),
('coffee_robusta',  'Coffee Robusta (Export)',   '☕', 'uganda', 'export',       'FOB Mombasa',  14500,   3.82,  'kg',  'UCDA',   'cash_crop', 4.2,  'Milled, FOB Mombasa. Screen 15+'),
('coffee_arabica',  'Coffee Arabica (Bugisu)',   '☕', 'uganda', 'farm_gate',    'Farm Gate',    11500,   3.02,  'kg',  'UCDA',   'cash_crop', 2.8,  'Bugisu/Elgon Arabica. Premium highland variety'),
('coffee_arabica',  'Coffee Arabica (Export)',   '☕', 'uganda', 'export',       'FOB Mombasa',  19000,   5.00,  'kg',  'UCDA',   'cash_crop', 2.8,  'Washed Arabica. Specialty grade'),

-- ── UGANDA TEA ──
('tea_green_leaf',  'Tea (Green Leaf)',          '🍃', 'uganda', 'farm_gate',    'Farm Gate',    950,     0.25,  'kg',  'UTGA',   'cash_crop', 1.5,  'Fresh green leaf to factories. Price per kg'),
('tea_made',        'Tea (Made / Export)',       '🍃', 'uganda', 'export',       'FOB Mombasa',  9800,    2.58,  'kg',  'UTGA',   'cash_crop', 1.5,  'Made tea, Mombasa auction price'),

-- ── UGANDA COTTON ──
('cotton_seed',     'Cotton (Seed Cotton)',      '🏵️', 'uganda', 'farm_gate',    'Farm Gate',    2100,    0.55,  'kg',  'CDO',    'cash_crop', -2.1, 'Seed cotton at ginnery gate. SMD variety'),
('cotton_lint',     'Cotton Lint (Export)',      '🏵️', 'uganda', 'export',       'FOB Mombasa',  7800,    2.05,  'kg',  'CDO',    'cash_crop', -2.1, 'Lint cotton, Grade A. Season Mar–Jul'),

-- ── VANILLA ──
('vanilla_green',   'Vanilla (Green Beans)',     '🌿', 'uganda', 'farm_gate',    'Farm Gate',    35000,   9.21,  'kg',  'UNBS',   'cash_crop', 8.5,  'Fresh green vanilla. Kibaale/Bundibugyo'),
('vanilla_cured',   'Vanilla (Cured Beans)',     '🌿', 'uganda', 'export',       'Export Grade', 380000,  100.0, 'kg',  'UNBS',   'cash_crop', 8.5,  'Cured & dried. Premium export. Price volatile'),

-- ── SIMSIM / SESAME ──
('sesame_simsim',   'Sesame / Simsim',           '🌾', 'uganda', 'farm_gate',    'Farm Gate',    5200,    1.37,  'kg',  'MAAIF',  'cash_crop', 5.0,  'White sesame. Lira, Gulu, Arua districts'),
('sesame_simsim',   'Sesame (Export)',            '🌾', 'uganda', 'export',       'FOB Mombasa',  5200,    1.37,  'kg',  'MAAIF',  'cash_crop', 5.0,  'Cleaned & graded. Japan/China market'),

-- ── SUNFLOWER ──
('sunflower',       'Sunflower Seeds',            '🌻', 'uganda', 'farm_gate',    'Farm Gate',    2200,    0.58,  'kg',  'MAAIF',  'cash_crop', 3.2,  'Dried seeds. Nakaseke, Luwero, Masindi'),
('sunflower_oil',   'Sunflower Oil (Refined)',    '🌻', 'uganda', 'local',        'Local Market', 8500,    2.24,  'kg',  'MAAIF',  'cash_crop', 3.2,  'Refined oil per litre. Mukwano, Bidco brands'),

-- ── SOYBEANS ──
('soybean',         'Soybeans',                   '🫛', 'uganda', 'farm_gate',    'Farm Gate',    2800,    0.74,  'kg',  'MAAIF',  'cash_crop', 1.8,  'Dried grain. Masindi, Hoima, Lira districts'),
('soybean',         'Soybeans (Export)',           '🫛', 'uganda', 'export',       'FOB Mombasa',  3800,    1.00,  'kg',  'MAAIF',  'cash_crop', 1.8,  'Cleaned, bagged. Export to Kenya/Tanzania'),

-- ── TOBACCO ──
('tobacco_flue',    'Tobacco (Flue-Cured)',       '🚬', 'uganda', 'farm_gate',    'Farm Gate',    18000,   4.74,  'kg',  'UTA',    'cash_crop', -4.0, 'Flue-cured leaf. Masindi, Bunyoro region'),
('tobacco_fire',    'Tobacco (Fire-Cured)',       '🚬', 'uganda', 'farm_gate',    'Farm Gate',    12000,   3.16,  'kg',  'UTA',    'cash_crop', -4.0, 'Fire-cured. Arua, West Nile region'),

-- ── COCOA ──
('cocoa_beans',     'Cocoa Beans',                '🍫', 'uganda', 'farm_gate',    'Farm Gate',    9500,    2.50,  'kg',  'UCDA',   'cash_crop', 12.0, 'Fermented & dried beans. Bundibugyo, Hoima'),
('cocoa_beans',     'Cocoa (Export)',              '🍫', 'uganda', 'export',       'FOB Mombasa',  16500,   4.34,  'kg',  'UCDA',   'cash_crop', 12.0, 'Grade 1. Growing demand, price rising sharply'),

-- ── GROUNDNUTS ──
('groundnuts',      'Groundnuts (Shelled)',       '🥜', 'uganda', 'farm_gate',    'Farm Gate',    4200,    1.11,  'kg',  'MAAIF',  'cash_crop', 2.5,  'Shelled, dried. Lira, Gulu, Soroti districts'),
('groundnuts',      'Groundnuts (Export)',        '🥜', 'uganda', 'export',       'FOB Mombasa',  6500,    1.71,  'kg',  'MAAIF',  'cash_crop', 2.5,  'Graded, cleaned. EU & Middle East markets'),

-- ── MAIZE (export grade) ──
('maize_export',    'Maize (Export Grade)',       '🌽', 'uganda', 'export',       'FOB Mombasa',  1100,    0.29,  'kg',  'NAADS',  'cash_crop', -1.5, 'Grade 1, moisture ≤13.5%. WFP contract price'),

-- ── BEANS (export) ──
('beans_export',    'Beans (Export Quality)',     '🫘', 'uganda', 'export',       'FOB Mombasa',  4200,    1.11,  'kg',  'MAAIF',  'cash_crop', 3.8,  'Red kidney, K132. East Africa & Middle East'),

-- ── MACADAMIA ──
('macadamia',       'Macadamia Nuts',             '🥜', 'uganda', 'farm_gate',    'Farm Gate',    7500,    1.97,  'kg',  'MAAIF',  'cash_crop', 6.5,  'In-shell nuts. Mt Elgon, western Uganda'),
('macadamia',       'Macadamia (Export)',         '🥜', 'uganda', 'export',       'FOB Mombasa',  28000,   7.37,  'kg',  'MAAIF',  'cash_crop', 6.5,  'Kernels, style 1. China & Europe market'),

-- ── AVOCADO ──
('avocado',         'Avocado (Hass)',              '🥑', 'uganda', 'farm_gate',    'Farm Gate',    1200,    0.32,  'kg',  'MAAIF',  'cash_crop', 9.0,  'Hass variety. Kabale, Kisoro, Mt Elgon'),
('avocado',         'Avocado (Export)',            '🥑', 'uganda', 'export',       'FOB Mombasa',  3800,    1.00,  'kg',  'MAAIF',  'cash_crop', 9.0,  'Grade 1 Hass. UAE, Europe markets growing'),

-- ============================================================================
-- EAST AFRICA regional prices
-- ============================================================================
('coffee_kenya',    'Coffee Kenya AA',            '☕', 'east_africa', 'export', 'Nairobi Auction', 28000, 7.37, 'kg', 'ICO/NCE',  'cash_crop', 5.5,  'Kenya AA grade. Nairobi Coffee Exchange'),
('coffee_ethiopia', 'Coffee Ethiopia Yirgacheffe','☕', 'east_africa', 'export', 'ECX Auction',     22000, 5.79, 'kg', 'ICO/ECX',  'cash_crop', 7.2,  'Washed specialty. Ethiopia Commodity Exchange'),
('coffee_tanzania', 'Coffee Tanzania Peaberry',   '☕', 'east_africa', 'export', 'FOB Dar',         18500, 4.87, 'kg', 'TCB',      'cash_crop', 3.1,  'Kilimanjaro Peaberry. Premium niche market'),
('tea_kenya',       'Tea Kenya (Mombasa Auction)','🍃', 'east_africa', 'export', 'Mombasa Auction', 12500, 3.29, 'kg', 'EATTA',    'cash_crop', 2.0,  'CTC Black Tea. World''s largest tea auction'),
('sesame_ethiopia', 'Sesame Ethiopia (Humera)',   '🌾', 'east_africa', 'export', 'FOB Djibouti',    5800,  1.53, 'kg', 'ECX',      'cash_crop', 6.8,  'White Humera sesame. Premium global grade'),
('avocado_kenya',   'Avocado Kenya Hass',         '🥑', 'east_africa', 'export', 'FOB Mombasa',     5200,  1.37, 'kg', 'HCD/KFC',  'cash_crop', 11.0, 'Kenya Hass. EU market leader. Rising fast'),
('pyrethrum',       'Pyrethrum (Kenya)',           '🌸', 'east_africa', 'export', 'FOB Mombasa',    76000, 20.0, 'kg', 'APC Kenya','cash_crop', 3.5,  'Natural insecticide. Kenya dominant producer'),
('macadamia_kenya', 'Macadamia Kenya',            '🥜', 'east_africa', 'export', 'FOB Mombasa',    32000, 8.42, 'kg', 'KMK',      'cash_crop', 5.0,  'Style 1 kernels. Kenya world #2 producer'),
('vanilla_madagascar','Vanilla (Madagascar)',      '🌿', 'east_africa', 'export', 'FOB Antananarivo',280000,73.68,'kg','GTVI',    'cash_crop', -8.0, 'World''s main vanilla supplier. Volatile price'),
('cashew_tanzania', 'Cashew Nuts (Tanzania)',     '🥜', 'east_africa', 'export', 'FOB Dar',        12500, 3.29, 'kg', 'CBT',      'cash_crop', 4.2,  'Raw cashews. Tanzania 3rd largest producer'),

-- ============================================================================
-- GLOBAL / International futures & exchange prices
-- ============================================================================
('coffee_arabica_global', 'Coffee Arabica (ICE C)',  '☕', 'global', 'international', 'ICE New York',   19200, 5.05, 'kg', 'ICE',    'cash_crop', 6.5,  'Arabica C contract. $/lb converted. May-2026'),
('coffee_robusta_global', 'Coffee Robusta (LIFFE)',  '☕', 'global', 'international', 'ICE London',     14000, 3.68, 'kg', 'LIFFE',  'cash_crop', 4.8,  'Robusta futures. $/mt converted. May-2026'),
('cocoa_global',    'Cocoa (ICE)',                  '🍫', 'global', 'international', 'ICE New York',   42000, 11.05,'kg', 'ICE',    'cash_crop', 18.0, 'Record highs 2024–26. Ghana/CI supply crunch'),
('cotton_global',   'Cotton (ICE)',                 '🏵️', 'global', 'international', 'ICE New York',   2900,  0.76, 'kg', 'ICE',    'cash_crop', -3.5, 'Cotton No. 2 futures. ¢/lb converted'),
('tea_global',      'Tea (Global Index)',            '🍃', 'global', 'international', 'Mombasa Auction', 11500, 3.03,'kg', 'EATTA',  'cash_crop', 2.1,  'Global blended average. Mombasa benchmark'),
('vanilla_global',  'Vanilla (Global)',             '🌿', 'global', 'international', 'Global OTC',     250000,65.79,'kg','Mintec', 'cash_crop', -12.0,'Madagascar supply recovery. Prices declining'),
('sesame_global',   'Sesame (Global)',              '🌾', 'global', 'international', 'Rotterdam',       6100,  1.61, 'kg', 'ISTA',   'cash_crop', 5.5,  'White sesame CIF Rotterdam. India/Africa supply'),
('sunflower_global','Sunflower Oil (Global)',       '🌻', 'global', 'international', 'Rotterdam',      10200, 2.68, 'kg', 'USDA',   'cash_crop', -2.0, 'Crude sunflower oil CIF Rotterdam'),
('soybean_global',  'Soybeans (CBOT)',              '🫛', 'global', 'international', 'CBOT Chicago',    1650,  0.43, 'kg', 'CBOT',   'cash_crop', -5.2, 'Soybean No. 1 Yellow. $/bu converted. Brazil bumper'),
('palm_oil_global', 'Palm Oil (Bursa)',             '🌴', 'global', 'international', 'Bursa Malaysia',  3800,  1.00, 'kg', 'BMD',    'cash_crop', 7.3,  'Crude palm oil futures. Malaysia/Indonesia'),
('rubber_global',   'Rubber (TOCOM)',               '🌳', 'global', 'international', 'TOCOM Tokyo',     5400,  1.42, 'kg', 'TOCOM',  'cash_crop', 2.8,  'TSR-20 grade. Japan futures exchange'),
('cashew_global',   'Cashew (Global)',              '🥜', 'global', 'international', 'Global OTC',     15000, 3.95, 'kg', 'ACA',    'cash_crop', 4.1,  'W240 grade. Vietnam processing premium'),
('macadamia_global','Macadamia (Global)',           '🥜', 'global', 'international', 'Global OTC',     35000, 9.21, 'kg', 'INC',    'cash_crop', 5.5,  'Style 1 kernels. South Africa benchmark'),
('avocado_global',  'Avocado (Global Hass)',        '🥑', 'global', 'international', 'Global OTC',      6500, 1.71, 'kg', 'ITC',    'cash_crop', 10.0, 'Hass grade 1. EU & China demand surging');
