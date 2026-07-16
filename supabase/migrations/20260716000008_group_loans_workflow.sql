-- group_loans was a display-only admin bookkeeping table (member_name as
-- free text, no link to a real borrower or group) with no way for a member
-- to actually apply, no approval workflow, and no real disbursement/
-- repayment against actual wallet balances — the page just said "Coming
-- Soon" underneath it. This turns it into the real thing: a member applies,
-- the group leader approves (disbursing from the group's pooled wallet into
-- the borrower's personal wallet) or rejects, and the borrower repays back
-- into the group wallet, same money rails as everywhere else in the app.
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES farmer_groups(id) ON DELETE CASCADE;
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS repaid_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE group_loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE group_loans DROP CONSTRAINT IF EXISTS group_loans_status_check;
ALTER TABLE group_loans ADD CONSTRAINT group_loans_status_check
  CHECK (status = ANY (ARRAY['pending', 'rejected', 'active', 'repaid', 'defaulted']));

-- Members can apply for their own loan and see their own applications —
-- the existing "Group admins manage loans" ALL policy already covers the
-- leader's side (view/approve/reject everything for their group).
DROP POLICY IF EXISTS "member_apply_own_loan" ON group_loans;
CREATE POLICY "member_apply_own_loan" ON group_loans FOR INSERT
  WITH CHECK (
    borrower_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM farmer_group_members fgm WHERE fgm.group_id = group_loans.group_id AND fgm.farmer_id = group_loans.borrower_id)
  );

DROP POLICY IF EXISTS "member_view_own_loan" ON group_loans;
CREATE POLICY "member_view_own_loan" ON group_loans FOR SELECT
  USING (borrower_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_group_loans_group    ON group_loans(group_id);
CREATE INDEX IF NOT EXISTS idx_group_loans_borrower ON group_loans(borrower_id);

DROP TRIGGER IF EXISTS update_group_loans_at ON group_loans;
CREATE TRIGGER update_group_loans_at BEFORE UPDATE ON group_loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
