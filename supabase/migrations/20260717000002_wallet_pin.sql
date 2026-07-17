-- Wallet PIN: a 4-digit PIN required before money leaves a wallet (withdraw
-- or send), independent of the account password. Protects against the
-- device-theft scenario — someone unlocking a phone with a signed-in
-- session still can't move money out without the PIN.
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;
