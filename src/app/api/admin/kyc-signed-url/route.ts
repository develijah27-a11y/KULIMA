import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/system-log';

const DOC_COLUMNS = [
  'national_id_url', 'selfie_url', 'business_reg_url',
  'driving_permit_url', 'vehicle_reg_url', 'insurance_url', 'vehicle_photo_url',
  'qualifications_url',
] as const;

// Admin-only: the kyc-documents bucket is private, so document links can't
// be read directly from the verifications table anymore (those columns now
// hold storage paths, not public URLs). This mints short-lived signed URLs
// on demand instead of ever exposing a permanent public link.
async function handlePOST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await (supabase.from as any)('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if ((admin as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { verificationId } = await req.json();
  if (!verificationId) return NextResponse.json({ error: 'verificationId required' }, { status: 400 });

  const service = createServiceRoleClient();
  const { data: verification, error } = await (service.from as any)('verifications')
    .select(DOC_COLUMNS.join(', '))
    .eq('id', verificationId)
    .single();
  if (error || !verification) return NextResponse.json({ error: 'Verification not found' }, { status: 404 });

  const urls: Record<string, string> = {};
  for (const col of DOC_COLUMNS) {
    const path = (verification as any)[col];
    if (!path) continue;
    const { data: signed } = await service.storage
      .from('kyc-documents')
      .createSignedUrl(path, 300);
    if (signed?.signedUrl) urls[col] = signed.signedUrl;
  }

  return NextResponse.json({ urls });
}

export const POST = withApiLogging('/api/admin/kyc-signed-url', handlePOST);
