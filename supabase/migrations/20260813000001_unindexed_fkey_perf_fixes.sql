-- Supabase performance advisor: unindexed_foreign_keys. Without a covering
-- index, every FK lookup, join, and ON DELETE cascade check on these columns
-- forces a sequential scan of the referencing table — fine at low volume,
-- but a real bottleneck once concurrent traffic ramps toward 50k users.
-- (Note: this migration only adds indexes. The linter's separate
-- "unused_index" findings are left alone — several of those are FK-covering
-- indexes added in earlier migrations that simply haven't been exercised by
-- production traffic yet; dropping them would undo that work right before
-- it's needed.)

CREATE INDEX IF NOT EXISTS idx_group_chat_listings_message_id ON public.group_chat_listings(message_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_listings_sender_id ON public.group_chat_listings(sender_id);
CREATE INDEX IF NOT EXISTS idx_offtaker_contracts_farmer_id ON public.offtaker_contracts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_pos_purchase_order_items_product_id ON public.pos_purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product_id ON public.pos_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_staff_id ON public.pos_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billed_by_group_id ON public.subscriptions(billed_by_group_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_escrow_id ON public.supplier_orders(escrow_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_supplier_order_id ON public.wallet_transactions(supplier_order_id);
