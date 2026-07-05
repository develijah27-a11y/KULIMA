-- Activate the platform commission wallet. platform_commission already has
-- a seeded 2.5% rate row (see 20260620000001_escrow_and_commission.sql), but
-- platform_wallet_user_id was left NULL — meaning escrow release computes
-- and logs the commission fee on the seller's side, but never actually
-- credits anyone. Point it at the first admin account, if one exists, so
-- commission collection actually starts working; admins can redesignate it
-- to a different (e.g. dedicated) wallet later from /admin/wallet.
UPDATE platform_commission
SET platform_wallet_user_id = (
  SELECT user_id FROM profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
)
WHERE active = TRUE
  AND platform_wallet_user_id IS NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');
