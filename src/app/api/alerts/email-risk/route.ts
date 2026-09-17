import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, riskAlertEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Determine target recipient
    const targetEmail = body.email || user?.email;
    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Recipient email address is required' },
        { status: 400 },
      );
    }

    let recipientName = body.recipientName;
    if (!recipientName && user) {
      const { data: profile } = await (supabase.from as any)('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      recipientName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Partner';
    } else if (!recipientName) {
      recipientName = targetEmail.split('@')[0] || 'Valued Partner';
    }

    const alertTitle = body.alertTitle || 'Weather & Logistics Risk Alert';
    const riskType = body.riskType || 'Weather & Supply Chain';
    const severity = body.severity || 'High';
    const affectedDistricts = Array.isArray(body.affectedDistricts) && body.affectedDistricts.length > 0
      ? body.affectedDistricts
      : ['Northern Uganda', 'Karamoja', 'Eastern Uganda'];
    const summary = body.summary || 'Unseasonal intense precipitation and road flooding have disrupted transit corridors and increased fungal moisture risk across contracted regional farming clusters.';
    const recommendedActions = Array.isArray(body.recommendedActions) && body.recommendedActions.length > 0
      ? body.recommendedActions
      : [
          'Verify moisture levels on incoming grains prior to warehouse intake.',
          'Reroute heavy delivery vehicles away from unpaved feeder roads.',
          'Coordinate with local farmer group leaders on safe staging locations.',
        ];

    const subject = `[Cropify Alert] ${severity.toUpperCase()} RISK: ${alertTitle}`;
    const html = riskAlertEmail({
      recipientName,
      alertTitle,
      riskType,
      severity,
      affectedDistricts,
      summary,
      recommendedActions,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.cropifyapp.com'}/offtaker/risk`,
    });

    const result = await sendEmail(targetEmail, subject, html);

    return NextResponse.json({
      success: true,
      email: targetEmail,
      delivered: !result.skipped && result.success,
      skipped: result.skipped,
      message: result.skipped
        ? 'Alert simulated (RESEND_API_KEY not configured in development, email skipped safely)'
        : `Automated risk alert delivered successfully to ${targetEmail}`,
    });
  } catch (err: any) {
    console.error('Error dispatching risk alert email:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch risk alert' },
      { status: 500 },
    );
  }
}
