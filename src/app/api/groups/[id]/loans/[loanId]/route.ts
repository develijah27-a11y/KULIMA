import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string; loanId: string }> };

// PATCH /api/groups/[id]/loans/[loanId] — { action: 'approve' | 'reject' | 'repay', ... }
// Every actual money movement (disbursement, repayment) goes through the
// service-role client, same as escrow releases and delivery payouts
// elsewhere in this app — wallets.balance is never writable directly by an
// authenticated user's own client, by design (see the 2026-07-14 wallet RLS
// hardening). This route does its own authorization checks in code first.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id: groupId, loanId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { action, rejectedReason, amount: repayAmount } = await req.json().catch(() => ({}) as any);
  const admin = createServiceRoleClient();

  const { data: loan } = await (admin.from as any)('group_loans')
    .select('id, group_id, borrower_id, amount, repaid_amount, status')
    .eq('id', loanId).eq('group_id', groupId).single();
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  const { data: group } = await (admin.from as any)('farmer_groups')
    .select('id, name, leader_id, wallet_balance').eq('id', groupId).single();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const isLeader = group.leader_id === myProfile.id;
  const isBorrower = loan.borrower_id === myProfile.id;

  if (action === 'approve' || action === 'reject') {
    if (!isLeader) return NextResponse.json({ error: 'Only the group leader can decide on a loan' }, { status: 403 });
    if (loan.status !== 'pending') return NextResponse.json({ error: 'This loan has already been decided' }, { status: 400 });

    if (action === 'reject') {
      await (admin.from as any)('group_loans').update({ status: 'rejected', rejected_reason: rejectedReason ?? null }).eq('id', loanId);
    } else {
      if (Number(group.wallet_balance) < Number(loan.amount)) {
        return NextResponse.json({ error: `Group wallet only has UGX ${Math.round(group.wallet_balance).toLocaleString()} — not enough to disburse UGX ${Math.round(loan.amount).toLocaleString()}` }, { status: 400 });
      }
      const { data: borrowerProfile } = await admin.from('profiles').select('user_id').eq('id', loan.borrower_id).single();
      const { data: borrowerWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', (borrowerProfile as any)?.user_id).single();
      if (!borrowerWallet) return NextResponse.json({ error: 'Borrower has no wallet to disburse to' }, { status: 400 });

      const now = new Date().toISOString();
      await Promise.all([
        (admin.from as any)('farmer_groups').update({ wallet_balance: Number(group.wallet_balance) - Number(loan.amount), wallet_updated_at: now }).eq('id', groupId),
        (admin.from as any)('wallets').update({ balance: Number(borrowerWallet.balance) + Number(loan.amount), updated_at: now }).eq('id', borrowerWallet.id),
        (admin.from as any)('wallet_transactions').insert({
          wallet_id: borrowerWallet.id, user_id: (borrowerProfile as any).user_id,
          type: 'transfer_in', amount: loan.amount, status: 'completed',
          description: `Group loan disbursed from ${group.name}`,
        }),
        (admin.from as any)('group_wallet_transactions').insert({
          group_admin_id: group.leader_id, type: 'withdrawal', amount: loan.amount,
          description: `Loan disbursed to member`,
        }),
        (admin.from as any)('group_loans').update({ status: 'active', disbursed_at: now }).eq('id', loanId),
      ]);
    }

    try {
      const { data: borrowerProfile } = await admin.from('profiles').select('user_id').eq('id', loan.borrower_id).single();
      if (borrowerProfile) {
        await notifyUser(admin, {
          userId: (borrowerProfile as any).user_id, role: 'farmer', type: 'loan',
          title: action === 'approve' ? 'Loan approved!' : 'Loan application declined',
          body: action === 'approve'
            ? `UGX ${Math.round(loan.amount).toLocaleString()} has been added to your wallet from ${group.name}.`
            : `Your loan request from ${group.name} was declined.`,
          url: '/farmer/groups',
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true });
  }

  if (action === 'repay') {
    if (!isBorrower) return NextResponse.json({ error: 'Only the borrower can repay this loan' }, { status: 403 });
    if (loan.status !== 'active') return NextResponse.json({ error: 'This loan is not active' }, { status: 400 });
    if (!repayAmount || isNaN(+repayAmount) || +repayAmount <= 0) {
      return NextResponse.json({ error: 'Enter a valid repayment amount' }, { status: 400 });
    }

    const { data: borrowerWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', user.id).single();
    if (!borrowerWallet || Number(borrowerWallet.balance) < +repayAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance for this repayment' }, { status: 400 });
    }

    const remaining = Number(loan.amount) - Number(loan.repaid_amount);
    const applied = Math.min(+repayAmount, remaining);
    const newRepaid = Number(loan.repaid_amount) + applied;
    const now = new Date().toISOString();

    await Promise.all([
      (admin.from as any)('wallets').update({ balance: Number(borrowerWallet.balance) - applied, updated_at: now }).eq('id', borrowerWallet.id),
      (admin.from as any)('wallet_transactions').insert({
        wallet_id: borrowerWallet.id, user_id: user.id,
        type: 'transfer_out', amount: applied, status: 'completed',
        description: `Loan repayment to ${group.name}`,
      }),
      (admin.from as any)('farmer_groups').update({ wallet_balance: Number(group.wallet_balance) + applied, wallet_updated_at: now }).eq('id', groupId),
      (admin.from as any)('group_wallet_transactions').insert({
        group_admin_id: group.leader_id, type: 'contribution', amount: applied,
        description: `Loan repayment received`,
      }),
      (admin.from as any)('group_loans').update({
        repaid_amount: newRepaid,
        status: newRepaid >= Number(loan.amount) ? 'repaid' : 'active',
      }).eq('id', loanId),
    ]);

    return NextResponse.json({ success: true, repaidAmount: newRepaid, fullyRepaid: newRepaid >= Number(loan.amount) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
