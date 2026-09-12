import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to submit verification.' }, { status: 401 });
    }

    const body = await req.json();
    const { level, role, urls } = body;

    if (!level || !role || !urls) {
      return NextResponse.json({ error: 'Missing required submission fields.' }, { status: 400 });
    }

    // Lookup user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    const profileId = profile?.id ?? user.id;

    // Use Service Role client to bypass any client-side RLS insert restrictions
    const admin = createServiceRoleClient();

    const verificationPayload = {
      user_id:            user.id,
      profile_id:         profileId,
      level,
      role,
      status:             'pending',
      national_id_url:    urls.national_id    ?? null,
      selfie_url:         urls.selfie         ?? null,
      business_reg_url:   urls.business_reg   ?? null,
      driving_permit_url: urls.driving_permit ?? null,
      vehicle_reg_url:    urls.vehicle_reg    ?? null,
      insurance_url:      urls.insurance_cert ?? null,
      vehicle_photo_url:  urls.vehicle_photo  ?? null,
      qualifications_url: urls.qualifications ?? null,
      submitted_at:       new Date().toISOString(),
    };

    const { data: inserted, error: dbError } = await (admin.from as any)('verifications')
      .insert(verificationPayload)
      .select('id')
      .single();

    if (dbError) {
      console.error('[/api/verify/submit] DB Insert Error:', dbError);
      return NextResponse.json({ error: `Verification submission failed: ${dbError.message}` }, { status: 500 });
    }

    // Best-effort admin notification
    try {
      await (admin.from as any)('notifications').insert({
        role: 'admin',
        title: 'New Verification Submitted',
        message: `${profile?.full_name || 'A user'} submitted ${role} KYC documents for level ${level}.`,
        type: 'verification',
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('[/api/verify/submit] Admin notification error (non-fatal):', notifErr);
    }

    return NextResponse.json({
      success: true,
      verificationId: inserted?.id,
      message: 'Verification submitted successfully.',
    });
  } catch (err: any) {
    console.error('[/api/verify/submit] Unexpected Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error while submitting verification.' }, { status: 500 });
  }
}
