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

    // Carry forward any previously submitted or verified documents if not re-uploaded in this submission
    const { data: previousDocs } = await (admin.from as any)('verifications')
      .select('national_id_url, selfie_url, business_reg_url, driving_permit_url, vehicle_reg_url, insurance_url, vehicle_photo_url, qualifications_url')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(5);

    const resolveDoc = (key: string, colName?: string): string | null => {
      if (urls[key]) return urls[key];
      const col = colName || `${key}_url`;
      for (const prev of previousDocs ?? []) {
        if (prev[col]) return prev[col];
      }
      return null;
    };

    const verificationPayload = {
      user_id:            user.id,
      profile_id:         profileId,
      level,
      role,
      status:             'pending',
      national_id_url:    resolveDoc('national_id', 'national_id_url'),
      selfie_url:         resolveDoc('selfie', 'selfie_url'),
      business_reg_url:   resolveDoc('business_reg', 'business_reg_url'),
      driving_permit_url: resolveDoc('driving_permit', 'driving_permit_url'),
      vehicle_reg_url:    resolveDoc('vehicle_reg', 'vehicle_reg_url'),
      insurance_url:      resolveDoc('insurance_cert', 'insurance_url'),
      vehicle_photo_url:  resolveDoc('vehicle_photo', 'vehicle_photo_url'),
      qualifications_url: resolveDoc('qualifications', 'qualifications_url'),
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
