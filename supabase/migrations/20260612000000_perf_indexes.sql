-- Performance indexes for KULIMA
-- Covers the hot query paths identified in the performance audit

-- profiles: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- listings: buyer marketplace browses by status + crop_type, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON public.listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_crop_type ON public.listings(crop_type);
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON public.listings(farmer_id);

-- notifications: layout unread-count and notification page both filter by read + sorted by sent_at
CREATE INDEX IF NOT EXISTS idx_notifications_read_sent ON public.notifications(read, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_farmer_id ON public.notifications(farmer_id);

-- market_prices: dashboard and prices page filter by recorded_at and crop_type
CREATE INDEX IF NOT EXISTS idx_market_prices_recorded_at ON public.market_prices(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_crop_district ON public.market_prices(crop_type, district);

-- farms: always filtered by user_id + is_active
CREATE INDEX IF NOT EXISTS idx_farms_user_active ON public.farms(user_id, is_active);

-- offers: farmer dashboard joins listings → offers; buyer filters by listing_id
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_status_created ON public.offers(status, created_at DESC);
