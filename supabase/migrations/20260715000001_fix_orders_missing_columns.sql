-- 20260615000003_orders_unified.sql intended to create `orders` with
-- crop_type/unit_price/total_amount, but used CREATE TABLE IF NOT EXISTS —
-- the table already existed from the original 20250524000000 schema, so
-- that whole block silently no-op'd and these three columns were never
-- actually added. Every other column that migration wanted (farmer_profile_id,
-- delivery_request_id, pickup_district, the *_at timestamps, etc.) exists
-- live because later migrations added them individually via real ALTER
-- TABLE statements — only these three fell through the gap.
--
-- Net effect: POST /api/orders (and every downstream route that reads
-- order.crop_type/unit_price/total_amount — escrow release, notifications,
-- the farmer/buyer order lists) has been failing on every single insert
-- with "column crop_type does not exist". Confirmed zero rows exist in
-- orders today, so this is a pure additive fix with no backfill needed.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS crop_type    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit_price   DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2);

ALTER TABLE orders ALTER COLUMN crop_type    SET NOT NULL;
ALTER TABLE orders ALTER COLUMN unit_price   SET NOT NULL;
ALTER TABLE orders ALTER COLUMN total_amount SET NOT NULL;

ALTER TABLE orders ADD CONSTRAINT orders_unit_price_check   CHECK (unit_price > 0);
ALTER TABLE orders ADD CONSTRAINT orders_total_amount_check CHECK (total_amount > 0);

-- seller_id and total_price are leftovers from the pre-unification schema
-- (20250524000000) — no current app code populates either (grepped clean;
-- the app uses farmer_profile_id and total_amount instead), so their NOT
-- NULL constraints made every insert fail the same way crop_type's did.
-- Relaxed rather than dropped in case anything still reads them.
ALTER TABLE orders ALTER COLUMN seller_id   DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN total_price DROP NOT NULL;
