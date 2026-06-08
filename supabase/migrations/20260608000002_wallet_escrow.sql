-- ============================================================================
-- KULIMA PAY — WALLET + ESCROW
-- ============================================================================

-- 1. Wallets (one per user)
CREATE TABLE IF NOT EXISTS wallets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance        DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  escrow_balance DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (escrow_balance >= 0),
  currency       TEXT NOT NULL DEFAULT 'UGX',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_wallet" ON wallets FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admins_view_wallets" ON wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Wallet transactions (full ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','escrow_lock','escrow_release','escrow_refund','transfer_in','transfer_out')),
  amount      DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  reference   TEXT,
  description TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_transactions" ON wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admins_view_transactions" ON wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_insert_transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_transactions" ON wallet_transactions FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created ON wallet_transactions(created_at DESC);

-- 3. Escrow accounts (per accepted offer)
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id       UUID REFERENCES offers(id) ON DELETE SET NULL,
  buyer_user_id  UUID NOT NULL REFERENCES auth.users(id),
  seller_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount         DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  status         TEXT NOT NULL DEFAULT 'funded' CHECK (status IN ('funded','released','refunded','disputed')),
  funded_at      TIMESTAMPTZ DEFAULT NOW(),
  released_at    TIMESTAMPTZ,
  admin_note     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow_parties_view" ON escrow_accounts FOR SELECT USING (
  buyer_user_id = auth.uid() OR seller_user_id = auth.uid()
);
CREATE POLICY "admins_manage_escrow" ON escrow_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_accounts(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_accounts(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_accounts(status);

-- 4. Mobile money requests
CREATE TABLE IF NOT EXISTS mobile_money_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount        DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  phone         TEXT NOT NULL,
  provider      TEXT NOT NULL CHECK (provider IN ('mtn','airtel')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  flutterwave_ref TEXT,
  failure_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mobile_money_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_momo" ON mobile_money_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admins_view_momo" ON mobile_money_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins_update_momo" ON mobile_money_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Auto-create wallet on new user
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_create_wallet ON auth.users;
CREATE TRIGGER trg_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();
