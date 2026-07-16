import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/loans — leader sees every application for their
// group; a member sees only their own.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: group } = await (supabase.from as any)('farmer_groups').select('leader_id').eq('id', groupId).single();
  const isLeader = group?.leader_id === myProfile.id;

  let query = (supabase.from as any)('group_loans')
    .select('id, borrower_id, amount, purpose, interest_rate, status, repayment_date, repaid_amount, disbursed_at, rejected_reason, created_at, borrower:profiles!group_loans_borrower_id_fkey(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!isLeader) query = query.eq('borrower_id', myProfile.id);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/groups/[id]/loans GET]', error);
    return NextResponse.json({ error: 'Failed to load loans. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ loans: data ?? [], isLeader });
}

// POST /api/groups/[id]/loans — a member applies for a loan from the
// group's pooled wallet. No money moves yet — that only happens once the
// leader approves (see [loanId]/route.ts).
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: membership } = await (supabase.from as any)('farmer_group_members')
    .select('id').eq('group_id', groupId).eq('farmer_id', myProfile.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });

  const { amount, purpose, repaymentDate } = await req.json();
  if (!amount || isNaN(+amount) || +amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid loan amount' }, { status: 400 });
  }

  // No overlapping active/pending application — one outstanding request at
  // a time keeps the group's exposure to any one member bounded.
  const { data: existing } = await (supabase.from as any)('group_loans')
    .select('id').eq('group_id', groupId).eq('borrower_id', myProfile.id).in('status', ['pending', 'active']).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending or active loan with this group' }, { status: 409 });
  }

  const [{ data: myMemberProfile }, { data: group }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', myProfile.id).single(),
    (supabase.from as any)('farmer_groups').select('name, leader_id').eq('id', groupId).single(),
  ]);

  const { data: loan, error } = await (supabase.from as any)('group_loans').insert({
    group_id:        groupId,
    borrower_id:     myProfile.id,
    admin_id:        group?.leader_id ?? null,
    member_name:     (myMemberProfile as any)?.full_name ?? 'Member',
    amount:          +amount,
    purpose:         purpose || null,
    interest_rate:   0,
    status:          'pending',
    repayment_date:  repaymentDate || null,
  }).select().single();

  if (error) {
    console.error('[/api/groups/[id]/loans POST]', error);
    return NextResponse.json({ error: 'Failed to submit loan application. Please try again.' }, { status: 500 });
  }

  try {
    if (group) {
      const { data: leaderProfile } = await supabase.from('profiles').select('user_id').eq('id', group.leader_id).single();
      if (leaderProfile) {
        await notifyUser(supabase, {
          userId: (leaderProfile as any).user_id,
          role: 'groups',
          type: 'loan',
          title: 'New loan application',
          body: `${(myMemberProfile as any)?.full_name ?? 'A member'} applied for a UGX ${Math.round(+amount).toLocaleString()} loan from ${group.name}.`,
          url: '/groups/loans',
        });
      }
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data: loan }, { status: 201 });
}
