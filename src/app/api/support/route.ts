import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other']),
  description: z.string().min(20).max(5000),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  screenshot_url: z.string().url().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = (supabase.from as any)('support_tickets')
    .select('id, subject, category, status, priority, created_at, updated_at, resolved_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: data ?? [], count });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });

  const { subject, category, description, priority, screenshot_url } = parsed.data;

  // Get profile for role/name
  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('user_id', user.id).single();

  // Build insert payload — omit screenshot_url if the column doesn't exist
  // yet (migration not applied). This prevents a schema-cache error from
  // blocking ticket creation entirely.
  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    user_name: (profile as any)?.full_name ?? 'User',
    user_role: (profile as any)?.role ?? 'unknown',
    subject,
    category,
    description,
    priority,
    status: 'open',
  };

  // Only include screenshot_url if one was provided — avoids the
  // "column not found in schema cache" error when the migration hasn't
  // been applied to the database yet.
  if (screenshot_url) {
    insertPayload.screenshot_url = screenshot_url;
  }

  const { data: ticket, error } = await (supabase.from as any)('support_tickets')
    .insert(insertPayload)
    .select('id, subject, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ticket }, { status: 201 });
}
