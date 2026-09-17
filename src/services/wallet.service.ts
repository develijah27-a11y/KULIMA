import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type WalletRow = Database['public']['Tables']['wallets']['Row'];
export type TransactionRow = Database['public']['Tables']['wallet_transactions']['Row'];

/**
 * Domain Service for Wallets & Balances.
 * Encapsulates wallet fetching, ledger operations, and transaction history.
 */
export class WalletService {
  /**
   * Retrieves user's wallet record with balance and status.
   * Cached per request via React cache().
   */
  static getWallet = cache(async (userId: string): Promise<WalletRow | null> => {
    if (!userId) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[WalletService.getWallet] error:', error);
      return null;
    }

    return data ?? null;
  });

  /**
   * Retrieves just the numeric wallet balance for a user.
   */
  static async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet?.balance ?? 0;
  }

  /**
   * Retrieves recent transactions for a user.
   */
  static async getRecentTransactions(userId: string, limit = 10): Promise<TransactionRow[]> {
    if (!userId) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[WalletService.getRecentTransactions] error:', error);
      return [];
    }

    return data ?? [];
  }
}
