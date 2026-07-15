-- Adds 'stock' to the allowed notifications.type values so low-stock
-- alerts (farm inputs, supplier products — see /api/cron/alerts) can be
-- inserted; the existing CHECK constraint didn't include it.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['rain','price','pest','offer','loan','system','kyc','delivery','payment','group','order','alert','stock']::text[]));
