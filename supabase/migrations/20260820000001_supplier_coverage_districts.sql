-- ============================================================
-- Agro-dealer service-area expansion
-- Lets a supplier list additional districts beyond their home
-- location where they want farmers to discover them — the
-- /supplier/coverage page previously had a "Coming Soon"
-- placeholder for this with no backing column at all.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coverage_districts TEXT[] NOT NULL DEFAULT '{}';

-- GIN index so the "district IN my coverage array" containment check
-- used by farmer-facing supplier discovery stays fast at scale.
CREATE INDEX IF NOT EXISTS idx_profiles_coverage_districts
  ON public.profiles USING GIN (coverage_districts);

NOTIFY pgrst, 'reload schema';
