import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type ListingRow = Database['public']['Tables']['listings']['Row'];
export type OfferRow = Database['public']['Tables']['offers']['Row'];

export interface OfferWithListing extends OfferRow {
  listing?: {
    crop_type: string;
    quantity_kg: number;
    asking_price: number;
    district: string;
    farmer_id: string;
  } | null;
}

/**
 * Domain Service for Marketplace & Produce Listings.
 * Centralizes listings, offers, counters, and market discovery queries.
 */
export class MarketplaceService {
  /**
   * Returns count of all active produce listings currently available on the market.
   */
  static getActiveListingsCount = cache(async (): Promise<number> => {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (error) {
      console.error('[MarketplaceService.getActiveListingsCount] error:', error);
      return 0;
    }
    return count ?? 0;
  });

  /**
   * Retrieves active or pending offers made by a buyer.
   */
  static async getBuyerOffers(
    buyerId: string,
    statuses: string[] = ['pending', 'countered', 'accepted'],
    limit = 6
  ): Promise<OfferWithListing[]> {
    if (!buyerId) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id, listing_id, buyer_id, offered_price, counter_price, status, message, created_at, updated_at,
        listing:listings(crop_type, quantity_kg, asking_price, district, farmer_id)
      `)
      .eq('buyer_id', buyerId)
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MarketplaceService.getBuyerOffers] error:', error);
      return [];
    }

    return (data as unknown as OfferWithListing[]) ?? [];
  }

  /**
   * Returns count of pending offers for a user.
   */
  static async getPendingOffersCount(userId: string, role: 'buyer' | 'farmer'): Promise<number> {
    if (!userId) return 0;
    const supabase = await createClient();

    if (role === 'buyer') {
      const { count, error } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('[MarketplaceService.getPendingOffersCount] error:', error);
        return 0;
      }
      return count ?? 0;
    }

    // Farmer: offers for listings owned by this farmer
    const { count, error } = await supabase
      .from('offers')
      .select('id, listing:listings!inner(farmer_id)', { count: 'exact', head: true })
      .eq('listing.farmer_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('[MarketplaceService.getPendingOffersCount] farmer error:', error);
      return 0;
    }
    return count ?? 0;
  }

  /**
   * Returns count of accepted orders/deals for a user.
   */
  static async getAcceptedOrdersCount(userId: string, role: 'buyer' | 'farmer'): Promise<number> {
    if (!userId) return 0;
    const supabase = await createClient();

    if (role === 'buyer') {
      const { count, error } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .eq('status', 'accepted');

      if (error) {
        console.error('[MarketplaceService.getAcceptedOrdersCount] error:', error);
        return 0;
      }
      return count ?? 0;
    }

    // Farmer: accepted deals on this farmer's listings
    const { count, error } = await supabase
      .from('offers')
      .select('id, listing:listings!inner(farmer_id)', { count: 'exact', head: true })
      .eq('listing.farmer_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('[MarketplaceService.getAcceptedOrdersCount] farmer error:', error);
      return 0;
    }
    return count ?? 0;
  }
}
