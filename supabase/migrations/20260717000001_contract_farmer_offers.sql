-- offtaker_contracts used to be pure paperwork — farmer_name was free text
-- with no link to a real account, so no farmer ever actually saw a contract
-- an offtaker created. This links contracts to real farmers and adds an
-- offer/response mechanism: when an offtaker creates a contract, it's
-- automatically surfaced to farmers they've frequently contracted with
-- before (for the same crop) and farmers they've favourited — not manually
-- picked from a list — and the first one to accept claims it.
ALTER TABLE offtaker_contracts ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE offtaker_contracts DROP CONSTRAINT IF EXISTS offtaker_contracts_status_check;
ALTER TABLE offtaker_contracts ADD CONSTRAINT offtaker_contracts_status_check
  CHECK (status = ANY (ARRAY['offered', 'active', 'completed', 'cancelled']));

CREATE TABLE IF NOT EXISTS offtaker_contract_offers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID        NOT NULL REFERENCES offtaker_contracts(id) ON DELETE CASCADE,
  farmer_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'notified' CHECK (status IN ('notified', 'accepted', 'declined', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (contract_id, farmer_id)
);

ALTER TABLE offtaker_contract_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farmer_view_own_offers" ON offtaker_contract_offers;
CREATE POLICY "farmer_view_own_offers" ON offtaker_contract_offers FOR SELECT
  USING (farmer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "offtaker_view_own_contract_offers" ON offtaker_contract_offers;
CREATE POLICY "offtaker_view_own_contract_offers" ON offtaker_contract_offers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM offtaker_contracts oc WHERE oc.id = offtaker_contract_offers.contract_id AND oc.offtaker_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_offtaker_contract_offers_farmer   ON offtaker_contract_offers(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_offtaker_contract_offers_contract ON offtaker_contract_offers(contract_id);

GRANT ALL ON offtaker_contract_offers TO service_role;
GRANT SELECT ON offtaker_contract_offers TO authenticated;
