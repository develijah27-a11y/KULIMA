-- Group listing sales with per-member contributions pay each farmer's own
-- wallet directly instead of the pooled group wallet. Record these as a
-- distinct type so the group wallet UI can exclude them from balance-
-- affecting totals (they never touch farmer_groups.wallet_balance).
ALTER TABLE group_wallet_transactions DROP CONSTRAINT group_wallet_transactions_type_check;
ALTER TABLE group_wallet_transactions ADD CONSTRAINT group_wallet_transactions_type_check
  CHECK (type = ANY (ARRAY['sale_payout'::text, 'sale_payout_split'::text, 'contribution'::text, 'withdrawal'::text, 'fee'::text]));
