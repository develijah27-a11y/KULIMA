-- ============================================================================
-- KULIMA — Atomic stock claims for listings and group listings
-- Fixes: "Buy Now" never decremented a listing's quantity_kg, so the same
-- stock could be sold to multiple buyers (order creation only compared the
-- requested quantity against the listing's static column, never reserved
-- it). Same atomic-RPC pattern already used for wallet balances
-- (claim_wallet_debit / credit_wallet) — a single conditional UPDATE takes
-- a row lock, so two concurrent orders on the same listing can't both
-- succeed once stock runs out.
-- Safe to re-run.
-- ============================================================================

-- Atomically reserves stock on a regular listing. Flips to 'sold' once the
-- remaining quantity hits zero. Returns FALSE (no exception) if the listing
-- isn't active or doesn't have enough stock left — callers treat that as
-- "someone else already bought it."
CREATE OR REPLACE FUNCTION claim_listing_stock(p_listing_id UUID, p_quantity_kg NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  UPDATE listings
  SET quantity_kg = quantity_kg - p_quantity_kg,
      status = CASE WHEN quantity_kg - p_quantity_kg <= 0 THEN 'sold' ELSE status END,
      updated_at = NOW()
  WHERE id = p_listing_id
    AND status = 'active'
    AND quantity_kg >= p_quantity_kg;

  RETURN FOUND;
END; $$;

-- Rolls back a claim (order-insert failed after stock was already reserved).
-- Additive, so it can't clobber a concurrent legitimate change — same
-- reasoning as credit_wallet's rollback-on-failure use.
CREATE OR REPLACE FUNCTION release_listing_stock(p_listing_id UUID, p_quantity_kg NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE listings
  SET quantity_kg = quantity_kg + p_quantity_kg,
      status = CASE WHEN status = 'sold' THEN 'active' ELSE status END,
      updated_at = NOW()
  WHERE id = p_listing_id;
END; $$;

-- Same pattern for group listings (total_quantity_kg / group_listings.status).
CREATE OR REPLACE FUNCTION claim_group_listing_stock(p_group_listing_id UUID, p_quantity_kg NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  UPDATE group_listings
  SET total_quantity_kg = total_quantity_kg - p_quantity_kg,
      status = CASE WHEN total_quantity_kg - p_quantity_kg <= 0 THEN 'sold' ELSE status END,
      updated_at = NOW()
  WHERE id = p_group_listing_id
    AND status = 'active'
    AND total_quantity_kg >= p_quantity_kg;

  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION release_group_listing_stock(p_group_listing_id UUID, p_quantity_kg NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE group_listings
  SET total_quantity_kg = total_quantity_kg + p_quantity_kg,
      status = CASE WHEN status = 'sold' THEN 'active' ELSE status END,
      updated_at = NOW()
  WHERE id = p_group_listing_id;
END; $$;

REVOKE ALL ON FUNCTION claim_listing_stock(UUID, NUMERIC)         FROM PUBLIC;
REVOKE ALL ON FUNCTION release_listing_stock(UUID, NUMERIC)       FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_group_listing_stock(UUID, NUMERIC)   FROM PUBLIC;
REVOKE ALL ON FUNCTION release_group_listing_stock(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_listing_stock(UUID, NUMERIC)         TO service_role;
GRANT EXECUTE ON FUNCTION release_listing_stock(UUID, NUMERIC)       TO service_role;
GRANT EXECUTE ON FUNCTION claim_group_listing_stock(UUID, NUMERIC)   TO service_role;
GRANT EXECUTE ON FUNCTION release_group_listing_stock(UUID, NUMERIC) TO service_role;
