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

  const { data: ticket, error } = await (supabase.from as any)('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const { data: replies } = await (supabase.from as any)('support_ticket_replies')
    .select('id, message, sender_type, sender_name, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ticket, replies: replies ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: ticket } = await (supabase.from as any)('support_tickets')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === 'closed') return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();

  const { data: reply, error } = await (supabase.from as any)('support_ticket_replies').insert({
    ticket_id: id,
    sender_type: 'user',
    sender_id: user.id,
    sender_name: (profile as any)?.full_name ?? 'User',
    message: parsed.data.message,
  }).select('id, message, sender_type, sender_name, created_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update ticket updated_at and reopen if it was pending user response
  await (supabase.from as any)('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: ticket.status === 'pending_user' ? 'open' : ticket.status })
    .eq('id', id);

  return NextResponse.json({ ok: true, reply }, { status: 201 });
}
