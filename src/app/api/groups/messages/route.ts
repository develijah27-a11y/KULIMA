import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUsers } from '@/lib/notify';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { adminId, body } = await req.json().catch(() => ({}));
  if (!adminId) return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
  
  const text = (body || '').trim();
  if (!text) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
  if (text.length > 3000) return NextResponse.json({ error: 'Message is too long (max 3000 chars)' }, { status: 400 });

  const admin = createServiceRoleClient();

  // 1. Get sender profile
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('user_id', user.id)
    .single();

  const senderName = profile?.full_name || 'Group Member';

  // 2. Validate membership if sender is not the group leader
  if (user.id !== adminId) {
    const { data: membership } = await (admin.from as any)('group_members')
      .select('id, status')
      .eq('admin_id', adminId)
      .eq('farmer_id', profile?.id)
      .maybeSingle();

    if (!membership && profile?.role !== 'admin') {
      // Check by phone fallback if farmer profile not linked
      return NextResponse.json({ error: 'You must be a member of this group to send messages.' }, { status: 403 });
    }
  }

  // 3. Insert message via service role client (guarantees delivery regardless of client-side RLS)
  const { data: msg, error: insertError } = await (admin.from as any)('group_messages')
    .insert({
      admin_id: adminId,
      sender_id: user.id,
      sender_name: senderName,
      body: text,
      created_at: new Date().toISOString(),
    })
    .select('id, admin_id, sender_id, sender_name, body, created_at')
    .single();

  if (insertError) {
    console.error('[POST /api/groups/messages] Insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to save message. Please try again.' }, { status: 500 });
  }

  // 4. Background notification to other group members
  (async () => {
    try {
      const recipientUserIds = new Set<string>();
      if (adminId !== user.id) recipientUserIds.add(adminId);

      const { data: members } = await (admin.from as any)('group_members')
        .select('farmer_id, profiles:profiles!group_members_farmer_id_fkey(user_id)')
        .eq('admin_id', adminId)
        .eq('status', 'active')
        .not('farmer_id', 'is', null);

      (members ?? []).forEach((m: any) => {
        const memberUserId = m.profiles?.user_id;
        if (memberUserId && memberUserId !== user.id) recipientUserIds.add(memberUserId);
      });

      if (recipientUserIds.size > 0) {
        const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
        await notifyUsers(admin, [...recipientUserIds].map(uId => ({
          userId: uId,
          role: 'farmer',
          type: 'group',
          title: `Group Message from ${senderName}`,
          body: preview,
          url: uId === adminId ? '/groups/chat' : `/farmer/groups/chat?room=${adminId}`,
        })));
      }
    } catch (notifErr) {
      console.warn('[POST /api/groups/messages] Notification notice:', notifErr);
    }
  })();

  return NextResponse.json({
    success: true,
    message: msg,
  });
}
