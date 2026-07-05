import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

// Accepts a JPEG captured live from the camera (never a picked file — the
// client only ever sends frames it grabbed from getUserMedia) and stores it
// in the public listing-images bucket. Uses the admin client for the actual
// storage write since RLS on storage.objects isn't reachable from this
// project's SQL role (see supabase/migrations for prior notes on this).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { dataUrl } = body as { dataUrl?: string };
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'A captured image is required' }, { status: 400 });
  }

  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
  const [, ext, base64] = match;
  const buffer = Buffer.from(base64, 'base64');

  const maxBytes = 6 * 1024 * 1024;
  if (buffer.length > maxBytes) return NextResponse.json({ error: 'Image too large (max 6MB)' }, { status: 400 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'jpg' ? 'jpeg' : ext}`;

  const { error: uploadError } = await admin.storage
    .from('listing-images')
    .upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: pub } = admin.storage.from('listing-images').getPublicUrl(path);
  return NextResponse.json({ success: true, url: pub.publicUrl });
}
