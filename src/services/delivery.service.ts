import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type DeliveryRequestRow = Database['public']['Tables']['delivery_requests']['Row'];

export interface DeliveryWithTransporter extends DeliveryRequestRow {
  transporter?: {
    full_name: string;
    phone_number: string | null;
    verification_level?: string | null;
  } | null;
}

/**
 * Domain Service for Deliveries & Transport Requests.
 * Encapsulates delivery job discovery, active transport tracking, and driver assignment.
 */
export class DeliveryService {
  /**
   * Returns count of active deliveries for a user.
   */
  static async getActiveDeliveriesCount(userId: string, role: 'buyer' | 'transporter' | 'farmer'): Promise<number> {
    if (!userId) return 0;
    const supabase = await createClient();

    if (role === 'transporter') {
      const { count, error } = await supabase
        .from('delivery_requests')
        .select('id', { count: 'exact', head: true })
        .eq('transporter_id', userId)
        .in('status', ['assigned', 'in_transit']);

      if (error) {
        console.error('[DeliveryService.getActiveDeliveriesCount] transporter error:', error);
        return 0;
      }
      return count ?? 0;
    }

    const { count, error } = await supabase
      .from('delivery_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .in('status', ['open', 'assigned', 'in_transit']);

    if (error) {
      console.error('[DeliveryService.getActiveDeliveriesCount] error:', error);
      return 0;
    }
    return count ?? 0;
  }

  /**
   * Retrieves active deliveries for a user with transporter profile details.
   */
  static async getRecentDeliveries(
    userId: string,
    role: 'buyer' | 'transporter' | 'farmer',
    limit = 5
  ): Promise<DeliveryWithTransporter[]> {
    if (!userId) return [];
    const supabase = await createClient();

    let query = supabase
      .from('delivery_requests')
      .select(`
        *,
        transporter:profiles!delivery_requests_transporter_id_fkey(full_name, phone_number, verification_level)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (role === 'transporter') {
      query = query.eq('transporter_id', userId);
    } else {
      query = query.eq('requester_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback without FK if specific constraint name differs
      const simpleRes = await supabase
        .from('delivery_requests')
        .select('*')
        .eq(role === 'transporter' ? 'transporter_id' : 'requester_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (simpleRes.data as unknown as DeliveryWithTransporter[]) ?? [];
    }

    return (data as unknown as DeliveryWithTransporter[]) ?? [];
  }
}
