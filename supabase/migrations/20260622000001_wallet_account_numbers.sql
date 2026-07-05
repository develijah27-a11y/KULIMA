-- Wallet account numbers — lets any wallet (farmer, buyer, transporter,
-- group, platform/admin, etc.) be identified by a stable, shareable number
-- so money can be sent to it directly (see wallet-to-wallet transfers).

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS account_number TEXT UNIQUE;

-- Generates "AGN" + a random 10-digit number, retrying on the (extremely
-- rare) chance of a collision so callers never have to handle that case.
CREATE OR REPLACE FUNCTION generate_wallet_account_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  attempts  INT := 0;
BEGIN
  LOOP
    candidate := 'AGN' || LPAD(FLOOR(RANDOM() * 10000000000)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM wallets WHERE account_number = candidate);
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate a unique wallet account number after % attempts', attempts;
    END IF;
  END LOOP;
  RETURN candidate;
END; $$;

CREATE OR REPLACE FUNCTION set_wallet_account_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := generate_wallet_account_number();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_wallet_account_number ON wallets;
CREATE TRIGGER trg_set_wallet_account_number
  BEFORE INSERT ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_wallet_account_number();

-- Backfill any wallets created before this migration.
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id FROM wallets WHERE account_number IS NULL LOOP
    UPDATE wallets SET account_number = generate_wallet_account_number() WHERE id = w.id;
  END LOOP;
END $$;

ALTER TABLE wallets ALTER COLUMN account_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON wallets(account_number);

-- Groups get their own wallet too (farmer_groups currently only tracks a
-- wallet_balance column — give it an account number the same way so group
-- payouts/contributions can also be addressed directly).
ALTER TABLE farmer_groups ADD COLUMN IF NOT EXISTS wallet_account_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generate_group_account_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  attempts  INT := 0;
BEGIN
  LOOP
    candidate := 'AGG' || LPAD(FLOOR(RANDOM() * 10000000000)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM farmer_groups WHERE wallet_account_number = candidate);
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate a unique group account number after % attempts', attempts;
    END IF;
  END LOOP;
  RETURN candidate;
END; $$;

CREATE OR REPLACE FUNCTION set_group_account_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.wallet_account_number IS NULL THEN
    NEW.wallet_account_number := generate_group_account_number();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_group_account_number ON farmer_groups;
CREATE TRIGGER trg_set_group_account_number
  BEFORE INSERT ON farmer_groups
  FOR EACH ROW EXECUTE FUNCTION set_group_account_number();

DO $$
DECLARE
  g RECORD;
BEGIN
  FOR g IN SELECT id FROM farmer_groups WHERE wallet_account_number IS NULL LOOP
    UPDATE farmer_groups SET wallet_account_number = generate_group_account_number() WHERE id = g.id;
  END LOOP;
END $$;
