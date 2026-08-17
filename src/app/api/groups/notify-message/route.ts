import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUsers } from '@/lib/notify';

// Group chat messages are inserted directly client-side (see
// GroupChatClient.tsx) and only ever reached other members through the
// realtime subscription — meaning zero notification of any kind (no push,
// no in-app bell entry) for anyone who didn't already have that exact chat
// screen open at that moment. Fired right after a successful send so every
// other real member of the group actually finds out a message arrived,
// instead of only whoever happened to be looking at the chat already.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { adminId, senderName, body, groupName } = await req.json().catch(() => ({}));
  if (!adminId || !body) return NextResponse.json({ error: 'adminId and body required' }, { status: 400 });

  const admin = createServiceRoleClient();

  // Every real (linked) member of this group, plus the group's own leader —
  // excluding the sender, whichever of those two they are. The leader's
  // own chat screen (/groups/chat) has no query param; a regular member's
  // entry point (/farmer/groups/chat) is keyed by ?room=<adminId> — these
  // are two different pages over the same group_messages room, per
  // src/app/farmer/groups/chat/page.tsx's own comment.
  const recipientUserIds = new Set<string>();
  if (adminId !== user.id) recipientUserIds.add(adminId);

  const { data: members } = await (admin.from as any)('group_members')
    .select('farmer_id, profiles:profiles!group_members_farmer_id_fkey(user_id)')
    .eq('admin_id', adminId)
    .not('farmer_id', 'is', null);

  (members ?? []).forEach((m: any) => {
    const memberUserId = m.profiles?.user_id;
    if (memberUserId && memberUserId !== user.id) recipientUserIds.add(memberUserId);
  });

  if (recipientUserIds.size === 0) return NextResponse.json({ success: true, notified: 0 });

  const preview = String(body).length > 80 ? `${String(body).slice(0, 77)}...` : body;
  const title = groupName ? `New message in ${groupName}` : 'New group message';

  await notifyUsers(admin, [...recipientUserIds].map(userId => ({
    userId,
    role: 'farmer',
    type: 'group',
    title,
    body: `${senderName ?? 'Someone'}: ${preview}`,
    url: userId === adminId ? '/groups/chat' : `/farmer/groups/chat?room=${adminId}`,
  })));

  return NextResponse.json({ success: true, notified: recipientUserIds.size });
}
