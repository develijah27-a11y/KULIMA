-- ============================================================================
-- FARM EXPENSES — Track actual input costs per crop/season
-- ============================================================================

CREATE TABLE IF NOT EXISTS farm_expenses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id         UUID        REFERENCES farms(id) ON DELETE SET NULL,
  crop_type       TEXT,
  category        TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  amount_ugx      NUMERIC(12,2) NOT NULL CHECK (amount_ugx >= 0),
  quantity        NUMERIC(10,3),
  unit            TEXT,                                     -- kg, bags, liters, days, etc.
  season          TEXT        NOT NULL DEFAULT 'A2026',     -- e.g. A2026, B2025
  expense_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_expenses" ON farm_expenses FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_expenses_user_season ON farm_expenses(user_id, season);
CREATE INDEX IF NOT EXISTS idx_expenses_crop        ON farm_expenses(user_id, crop_type);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON farm_expenses(expense_date DESC);

-- ============================================================================
-- FARM PROJECTIONS — Save calculator results as seasonal plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS farm_projections (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id               UUID        REFERENCES farms(id) ON DELETE SET NULL,
  crop_type             TEXT        NOT NULL,
  area_ha               NUMERIC(8,2) NOT NULL,
  season                TEXT        NOT NULL DEFAULT 'A2026',
  irrigated             BOOLEAN     NOT NULL DEFAULT false,
  market_price_per_kg   NUMERIC(10,2) NOT NULL,
  target_margin_pct     INTEGER     NOT NULL DEFAULT 40,
  costs_json            JSONB       NOT NULL DEFAULT '{}',  -- snapshot of all input costs
  projected_yield_kg    INTEGER,
  projected_revenue_ugx NUMERIC(12,2),
  projected_profit_ugx  NUMERIC(12,2),
  suggested_price_per_kg NUMERIC(10,2),
  break_even_price_per_kg NUMERIC(10,2),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_projections" ON farm_projections FOR ALL USING (user_id = auth.uid());
