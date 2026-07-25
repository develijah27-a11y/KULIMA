import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ReplySchema = z.object({ message: z.string().min(1).max(5000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const { error } = await (supabase.from as any)('support_ticket_replies').insert({
    ticket_id: id,
    sender_type: 'admin',
    sender_id: user.id,
    sender_name: (profile as any)?.full_name ?? 'AgriNova Support',
    message: parsed.data.message,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update ticket to in_progress when admin first replies
  await (supabase.from as any)('support_tickets')
    .update({ status: 'pending_user', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'open');

  return NextResponse.json({ ok: true }, { status: 201 });
}
