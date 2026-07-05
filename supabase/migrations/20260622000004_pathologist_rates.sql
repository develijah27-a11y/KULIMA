-- Pathologist consultation rates. The UI (RateSettings.tsx) and both the
-- read (profile/page.tsx) and write (api/profile/route.ts) sides already
-- reference profiles.remote_fee_ugx / visit_fee_ugx, but the columns were
-- never actually added to the database — the feature could never have
-- worked past a "column does not exist" error at runtime.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS remote_fee_ugx DECIMAL(10, 2) CHECK (remote_fee_ugx IS NULL OR remote_fee_ugx > 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visit_fee_ugx  DECIMAL(10, 2) CHECK (visit_fee_ugx  IS NULL OR visit_fee_ugx  > 0);
