-- Signup previously only showed a passive "by creating an account you agree
-- to our Terms..." line with no checkbox and nothing recorded — not real
-- consent, and nothing to point to if it were ever disputed. Records when
-- (not just whether) each user accepted, since that's what actually matters
-- for a compliance record — a bare boolean can't prove anything.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
