-- ============================================================================
-- FARM WORKERS — Assign roles to farm workers
-- ============================================================================

CREATE TABLE IF NOT EXISTS farm_workers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id     UUID        REFERENCES farms(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  phone       TEXT,
  role        TEXT        NOT NULL DEFAULT 'field_worker',
  tasks       TEXT[]      NOT NULL DEFAULT '{}',
  wage_ugx    NUMERIC(10,2),
  wage_period TEXT        NOT NULL DEFAULT 'daily',   -- daily | monthly | seasonal
  start_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_workers" ON farm_workers FOR ALL USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_workers_owner   ON farm_workers(owner_id);
CREATE INDEX IF NOT EXISTS idx_workers_farm    ON farm_workers(farm_id);
CREATE INDEX IF NOT EXISTS idx_workers_active  ON farm_workers(owner_id, is_active);
