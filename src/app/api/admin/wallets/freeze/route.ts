import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, frozen, reason } = await req.json();
  if (!userId || typeof frozen !== 'boolean') {
    return NextResponse.json({ error: 'userId and frozen (boolean) are required' }, { status: 400 });
  }

  const { data: wallet, error } = await (supabase.from as any)('wallets')
    .update({ is_frozen: frozen, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !wallet) {
    console.error('[/api/admin/wallets/freeze]', error);
    return NextResponse.json({ error: 'Wallet not found or failed to update.' }, { status: 404 });
  }

  await (supabase.from as any)('notifications').insert({
    user_id: userId,
    type: 'alert',
    title: frozen ? 'Your wallet has been frozen' : 'Your wallet has been unfrozen',
    body: frozen
      ? `Your wallet is temporarily frozen pending review.${reason ? ` Reason: ${reason}` : ''} Contact support for details.`
      : 'Your wallet has been restored and is active again.',
    data: { admin_action: frozen ? 'freeze' : 'unfreeze' },
  });

  await (supabase.from as any)('audit_logs').insert({
    user_id: user.id,
    action: frozen ? 'wallet_frozen' : 'wallet_unfrozen',
    table_name: 'wallets',
    record_id: wallet.id,
    new_data: { user_id: userId, is_frozen: frozen, reason: reason ?? null },
  });

  return NextResponse.json({ success: true });
}
