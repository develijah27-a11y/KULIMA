-- Rename the Flutterwave-branded column to a gateway-agnostic name now that
-- the payment provider has been swapped to Nylon Pay.
ALTER TABLE mobile_money_requests RENAME COLUMN flutterwave_ref TO provider_ref;
