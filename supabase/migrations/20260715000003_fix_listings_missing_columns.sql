-- src/app/buyer/listings/[id]/page.tsx selects quality_grade on `listings`,
-- and src/app/buyer/requests/page.tsx does the same — but the column was
-- never added by any migration. PostgREST rejects unknown columns in a
-- select, so both queries have been erroring on every request; the listing
-- detail page treats a failed/absent row as "not found" and 404s, which is
-- the "View & Make Offer" button bug — clicking it always lands on a 404
-- because the very query that loads the page can't run.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quality_grade TEXT;
