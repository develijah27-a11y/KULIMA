import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/system-log';

async function handleGET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });

  return NextResponse.json({ success: true, data: null, note: 'Admin auth verified' });
}

export const GET = withApiLogging('/api/admin/verify', handleGET);
