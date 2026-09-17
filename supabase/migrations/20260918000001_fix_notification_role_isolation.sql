-- ─────────────────────────────────────────────────────────────────────────────
-- Cropify: Notification Role Partition & Isolation
-- Ensures existing untagged notifications are cleanly categorized by role so
-- that multi-role users never see cross-dashboard notifications.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Delivery request payment reminders and arrival notices belong to the requester (buyer/farmer), never transporter
UPDATE public.notifications
SET role = 'buyer'
WHERE role IS NULL
  AND (
    title ILIKE '%delivery payment still pending%'
    OR title ILIKE '%delivery arrived%'
    OR title ILIKE '%driver accepted your delivery%'
    OR title ILIKE '%your driver is waiting%'
    OR body ILIKE '%your delivery request for%'
  );

-- 2. Escrow and marketplace buyer orders
UPDATE public.notifications
SET role = 'buyer'
WHERE role IS NULL
  AND (
    title ILIKE '%awaiting your escrow payment%'
    OR title ILIKE '%order placed%'
    OR body ILIKE '%awaiting your escrow payment%'
  );

-- 3. Transporter haulage jobs
UPDATE public.notifications
SET role = 'transporter'
WHERE role IS NULL
  AND (
    title ILIKE '%new haulage job%'
    OR title ILIKE '%delivery job%'
    OR title ILIKE '%you are free%'
    OR body ILIKE '%delivery job was not completed%'
  );

-- 4. Crop disease and harvest notifications belong to farmer
UPDATE public.notifications
SET role = 'farmer'
WHERE role IS NULL
  AND (
    type IN ('pest', 'disease', 'rain', 'weather')
    OR title ILIKE '%crop%'
    OR title ILIKE '%harvest%'
  );
