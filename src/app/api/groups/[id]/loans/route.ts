import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/loans — leader sees every application for their
// group; a member sees only their own.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();

  const { data: myProfile } = await admin.from('profiles').select('id, full_name').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: group } = await (admin.from as any)('farmer_groups')
    .select('id, name, leader_id, created_by, wallet_balance')
    .eq('id', groupId)
    .single();

  const isLeader = group?.leader_id === myProfile.id || group?.created_by === user.id;

  let query = (admin.from as any)('group_loans')
    .select('id, borrower_id, amount, purpose, interest_rate, status, repayment_date, repaid_amount, disbursed_at, rejected_reason, created_at, member_name, borrower:profiles!group_loans_borrower_id_fkey(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!isLeader) query = query.eq('borrower_id', myProfile.id);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/groups/[id]/loans GET]', error);
    return NextResponse.json({ error: 'Failed to load loans. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    loans: data ?? [],
    isLeader,
    groupWalletBalance: Number(group?.wallet_balance ?? 0),
    groupName: group?.name ?? 'Farmer Group',
  });
}

// POST /api/groups/[id]/loans — a member applies for a loan from the
// group's pooled wallet.
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();

  const { data: myProfile } = await admin.from('profiles').select('id, full_name, phone_number').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: group } = await (admin.from as any)('farmer_groups')
    .select('id, name, leader_id, created_by, wallet_balance')
    .eq('id', groupId)
    .single();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const isLeader = group.leader_id === myProfile.id || group.created_by === user.id;

  // Check membership across both farmer_group_members and group_members
  let isMember = isLeader;

  if (!isMember) {
    const { data: fgm } = await (admin.from as any)('farmer_group_members')
      .select('id')
      .eq('group_id', groupId)
      .or(`farmer_id.eq.${myProfile.id},farmer_id.eq.${user.id}`)
      .maybeSingle();

    if (fgm) isMember = true;
  }

  if (!isMember) {
    const adminId = group.created_by || user.id;
    const { data: gm } = await (admin.from as any)('group_members')
      .select('id')
      .eq('admin_id', adminId)
      .or(`farmer_id.eq.${myProfile.id},farmer_id.eq.${user.id}`)
      .maybeSingle();

    if (gm) isMember = true;
  }

  // Auto-enroll if not enrolled yet to prevent blocking legitimate farmers
  if (!isMember) {
    try {
      await (admin.from as any)('farmer_group_members').insert({
        group_id: groupId,
        farmer_id: myProfile.id,
        role: 'member',
      });
      isMember = true;
    } catch {
      // Ignored if already exists
    }
  }

  const { amount, purpose, repaymentDate } = await req.json().catch(() => ({}));
  if (!amount || isNaN(+amount) || +amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid loan amount in UGX' }, { status: 400 });
  }

  // Prevent multiple active loans
  const { data: existing } = await (admin.from as any)('group_loans')
    .select('id')
    .eq('group_id', groupId)
    .eq('borrower_id', myProfile.id)
    .in('status', ['pending', 'active'])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You already have an active or pending loan with this group' }, { status: 409 });
  }

  const { data: loan, error } = await (admin.from as any)('group_loans').insert({
    group_id:        groupId,
    borrower_id:     myProfile.id,
    admin_id:        group.leader_id ?? group.created_by ?? null,
    member_name:     myProfile.full_name ?? 'Member',
    amount:          +amount,
    purpose:         purpose?.trim() || null,
    interest_rate:   0,
    status:          'pending',
    repayment_date:  repaymentDate || null,
    repaid_amount:   0,
  }).select().single();

  if (error) {
    console.error('[/api/groups/[id]/loans POST]', error);
    return NextResponse.json({ error: 'Failed to submit loan application. Please try again.' }, { status: 500 });
  }

  try {
    const { data: leaderProfile } = await admin.from('profiles').select('user_id').eq('id', group.leader_id).maybeSingle();
    const leaderUserId = (leaderProfile as any)?.user_id ?? group.created_by;
    if (leaderUserId && leaderUserId !== user.id) {
      await notifyUser(admin, {
        userId: leaderUserId,
        role: 'groups',
        type: 'loan',
        title: 'New loan application',
        body: `${myProfile.full_name ?? 'A member'} requested a UGX ${Math.round(+amount).toLocaleString()} loan from ${group.name}.`,
        url: '/groups/loans',
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data: loan }, { status: 201 });
}
