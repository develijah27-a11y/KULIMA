-- Transporter KYC (blue level) now also requires proof of insurance and a
-- photo of the actual vehicle (plate visible) — brings verification in line
-- with what comparable logistics platforms (SafeBoda, Bolt, Kobo360, Sendy)
-- require for a commercial driver, beyond just ID + permit + logbook.
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS insurance_url text,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url text;
