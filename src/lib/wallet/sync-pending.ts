import { createServiceRoleClient } from '@/lib/supabase/server';
import { primepay } from '@/lib/prime-pay';

/**
 * Automatically syncs and reconciles any processing/pending transactions for a user
 * against the live PrimePay gateway status.
 */
export async function syncPendingTransactions(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const admin = createServiceRoleClient();

    // Query pending/processing transactions
    const { data: pendingRequests } = await (admin.from as any)('mobile_money_requests')
      .select('id, user_id, amount, status, type, provider_ref, provider, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (!pendingRequests || pendingRequests.length === 0) return;

    for (const req of pendingRequests) {
      const statusId = req.provider_ref || req.id;
      if (!statusId) continue;

      const inquiry = await primepay.checkPaymentStatus(statusId);

      if (inquiry.status === 'completed') {
        if (req.type === 'deposit') {
          let credited = false;
          try {
            const { data: claimed, error: claimErr } = await (admin as any).rpc('claim_deposit', {
              p_request_id: req.id,
              p_wallet_user_id: userId,
              p_amount: Number(req.amount),
              p_reference: statusId,
              p_description: `Mobile money deposit via ${req.provider ? req.provider.toUpperCase() : 'Mobile Money'}`,
              p_metadata: { verified_via: 'auto_sync' },
            });
            if (!claimErr && claimed) credited = true;
          } catch {}

          if (!credited) {
            const { data: updatedReq } = await (admin.from as any)('mobile_money_requests')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', req.id)
              .neq('status', 'completed')
              .select('id')
              .maybeSingle();

            if (updatedReq) {
              const { data: userWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', userId).single();
              if (userWallet) {
                await (admin.from as any)('wallets').update({
                  balance: Number(userWallet.balance || 0) + Number(req.amount),
                  updated_at: new Date().toISOString(),
                }).eq('id', userWallet.id);

                await (admin.from as any)('wallet_transactions').insert({
                  wallet_id: userWallet.id,
                  user_id: userId,
                  type: 'deposit',
                  amount: Number(req.amount),
                  status: 'completed',
                  reference: statusId,
                  description: `Mobile money deposit via ${req.provider ? req.provider.toUpperCase() : 'Mobile Money'}`,
                });
              }
            }
          }
        } else if (req.type === 'withdrawal') {
          await Promise.all([
            (admin.from as any)('mobile_money_requests').update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            }).eq('id', req.id),
            (admin.from as any)('wallet_transactions').update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            }).or(`reference.eq.${statusId},reference.eq.${req.provider_ref},reference.eq.${req.id}`),
          ]);
        }
      } else if (inquiry.status === 'failed') {
        if (req.type === 'withdrawal') {
          const { data: wallet } = await (admin.from as any)('wallets').select('id').eq('user_id', userId).single();
          if (wallet) {
            await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: req.amount });
          }
          await Promise.all([
            (admin.from as any)('mobile_money_requests').update({
              status: 'failed',
              failure_reason: inquiry.message || 'Payout declined by network operator',
              updated_at: new Date().toISOString(),
            }).eq('id', req.id),
            (admin.from as any)('wallet_transactions').update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            }).or(`reference.eq.${statusId},reference.eq.${req.provider_ref},reference.eq.${req.id}`),
          ]);
        } else {
          await (admin.from as any)('mobile_money_requests').update({
            status: 'failed',
            failure_reason: inquiry.message || 'Payment prompt was declined or expired',
            updated_at: new Date().toISOString(),
          }).eq('id', req.id);
        }
      }
    }
  } catch (err) {
    console.warn('[Cropify Wallet] Background sync notice:', err);
  }
}
