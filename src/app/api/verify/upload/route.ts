import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const targetRaw = (formData.get('target') as string) || 'green';
    const docKeyRaw = (formData.get('docKey') as string) || 'document';

    // Strictly sanitize target and docKey to prevent directory traversal
    const target = targetRaw.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32) || 'green';
    const docKey = docKeyRaw.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || 'document';
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
    }

    // Whitelist allowed file extensions and MIME types
    const rawExt = (file.name.split('.').pop() || '').toLowerCase();
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!ALLOWED_EXTENSIONS.includes(rawExt) && !ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Only JPG, PNG, WEBP, and PDF documents are allowed.' }, { status: 400 });
    }

    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg';
    const contentType = ALLOWED_MIMES.includes(file.type) ? file.type : (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
    const path = `${user.id}/${target}/${docKey}.${ext}`;

    const admin = createServiceRoleClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from('kyc-documents')
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[POST /api/verify/upload] Storage error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, key: docKey, path });
  } catch (err: any) {
    console.error('[POST /api/verify/upload] Exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload document' }, { status: 500 });
  }
}
