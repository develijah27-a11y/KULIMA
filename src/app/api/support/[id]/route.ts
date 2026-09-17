import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ReplySchema = z.object({
  message: z.string().min(1).max(5000),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('user_id', user.id)
    .single();

  const userRoles: string[] = (profile as any)?.roles ?? [];
  const primaryRole: string = (profile as any)?.role ?? '';
  const isAdmin = primaryRole === 'admin' || userRoles.includes('admin');

  let query = (supabase.from as any)('support_tickets').select('*').eq('id', id);
  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }
  const { data: ticket, error } = await query.single();

  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  let userProfile: any = null;
  if (isAdmin && ticket.user_id) {
    const { data: up } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone_number, location, role')
      .eq('user_id', ticket.user_id)
      .single();
    userProfile = up ?? null;
  }

  const { data: replies } = await (supabase.from as any)('support_ticket_replies')
    .select('id, message, sender_type, sender_name, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ticket, userProfile, replies: replies ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('user_id', user.id)
    .single();

  const userRoles: string[] = (profile as any)?.roles ?? [];
  const primaryRole: string = (profile as any)?.role ?? '';
  const isAdmin = primaryRole === 'admin' || userRoles.includes('admin');

  // Verify ownership or admin privileges
  let ticketQuery = (supabase.from as any)('support_tickets').select('id, status, user_id').eq('id', id);
  if (!isAdmin) {
    ticketQuery = ticketQuery.eq('user_id', user.id);
  }
  const { data: ticket } = await ticketQuery.single();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === 'closed') return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const senderType = isAdmin ? 'admin' : 'user';
  const senderName = (profile as any)?.full_name ?? (isAdmin ? 'Cropify Support' : 'User');

  const { data: reply, error } = await (supabase.from as any)('support_ticket_replies').insert({
    ticket_id: id,
    sender_type: senderType,
    sender_id: user.id,
    sender_name: senderName,
    message: parsed.data.message,
  }).select('id, message, sender_type, sender_name, created_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nextStatus = isAdmin
    ? (ticket.status === 'open' ? 'pending_user' : ticket.status)
    : (ticket.status === 'pending_user' ? 'open' : ticket.status);

  await (supabase.from as any)('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: nextStatus })
    .eq('id', id);

  return NextResponse.json({ ok: true, reply }, { status: 201 });
}
