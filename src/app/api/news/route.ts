import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgriculturalNews } from '@/lib/news';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await getAgriculturalNews();

  return NextResponse.json(
    { items, available: items.length > 0 },
    { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800' } },
  );
}
