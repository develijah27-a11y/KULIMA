import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];

// POST /api/groups/chat-listings — a member (or the admin themselves) sends
// a listing from inside their group chat: crop + quantity + optional notes,
// filed as a real record (not free text) plus a matching chat bubble, so it
// reads in the stream as a distinct, orderly entry rather than getting lost
// among regular messages.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { adminId, cropType, quantityKg, notes } = await req.json();
  if (!adminId) return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
  if (!cropType || !CROPS.includes(cropType)) return NextResponse.json({ error: 'Select a valid crop' }, { status: 400 });
  if (!quantityKg || isNaN(+quantityKg) || +quantityKg <= 0) {
    return NextResponse.json({ error: 'Enter a valid quantity in kg' }, { status: 400 });
  }

  const { data: myProfile } = await supabase.from('profiles').select('id, full_name').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (user.id !== adminId) {
    const { data: membership } = await (supabase.from as any)('group_members')
      .select('id').eq('admin_id', adminId).eq('farmer_id', (myProfile as any).id).maybeSingle();
    if (!membership) return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
  }

  const senderName = (myProfile as any).full_name ?? 'Member';
  const body = `📦 LISTING · ${+quantityKg}kg ${cropType}${notes ? ` — ${notes}` : ''}`;

  const { data: message, error: msgError } = await (supabase.from as any)('group_messages')
    .insert({ admin_id: adminId, sender_id: user.id, sender_name: senderName, body })
    .select('id, admin_id, sender_id, sender_name, body, created_at')
    .single();

  if (msgError) {
    console.error('[/api/groups/chat-listings POST message]', msgError);
    return NextResponse.json({ error: 'Failed to send listing. Please try again.' }, { status: 500 });
  }

  const { data: listing, error: listingError } = await (supabase.from as any)('group_chat_listings')
    .insert({
      admin_id:    adminId,
      sender_id:   user.id,
      sender_name: senderName,
      crop_type:   cropType,
      quantity_kg: +quantityKg,
      notes:       notes || null,
      message_id:  message.id,
    })
    .select()
    .single();

  if (listingError) {
    console.error('[/api/groups/chat-listings POST listing]', listingError);
    return NextResponse.json({ error: 'Message sent, but the listing record failed to save. Contact your group admin.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message, listing }, { status: 201 });
}
