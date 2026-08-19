import { NextResponse } from 'next/server';
import {
  sendEmail,
  purchaseReceiptEmail,
  resetPasswordEmail,
  deliveryArrivedEmail,
  getResendClient,
} from '@/lib/email';

export async function GET() {
  const { client, from } = getResendClient();
  const isConfigured = Boolean(client);

  return NextResponse.json({
    status: 'ok',
    resendConfigured: isConfigured,
    emailFrom: from,
    info: isConfigured
      ? 'Resend API key is configured and ready.'
      : 'RESEND_API_KEY is not set or placeholder. Please set RESEND_API_KEY in your environment variables.',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, type = 'receipt', customAmount } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json(
        { error: 'A valid "to" recipient email address is required in the request body.' },
        { status: 400 }
      );
    }

    const { client, from } = getResendClient();
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'RESEND_API_KEY is not set in environment variables.',
          hint: 'Set RESEND_API_KEY and EMAIL_FROM in your .env.local (locally) or Vercel Project Settings (production).',
        },
        { status: 503 }
      );
    }

    let subject = '';
    let html = '';

    if (type === 'reset') {
      subject = 'Test: Reset your Cropify password';
      const resetUrl = 'https://www.cropifyapp.com/auth/reset-password';
      html = resetPasswordEmail({
        resetUrl,
        requestedAt: new Date().toISOString(),
      });
    } else if (type === 'delivery') {
      subject = 'Test: Your Cropify delivery has arrived';
      html = deliveryArrivedEmail({
        recipientName: 'Valued Customer',
        cargoType: 'Fresh Tomatoes',
        cargoKg: 250,
        pickupDistrict: 'Mukono',
        pickupLocation: 'Farm Gate 3',
        dropoffDistrict: 'Kampala',
        dropoffLocation: 'Nakasero Market',
        fare: customAmount ? Number(customAmount) : 85000,
        distanceKm: 28,
        deliveryType: 'standard',
        deliveredAt: new Date().toISOString(),
        receiptNo: `AGN-TEST-${Date.now().toString().slice(-6)}`,
      });
    } else {
      // Default: purchase receipt
      subject = 'Test: Your Cropify purchase receipt';
      html = purchaseReceiptEmail({
        buyerName: 'Valued Customer',
        dealerName: 'Green Harvest Agro Supplies',
        productName: 'Organic NPK Fertilizer (50kg)',
        quantity: 2,
        unit: 'bags',
        unitPrice: 120000,
        amount: customAmount ? Number(customAmount) : 240000,
        district: 'Wakiso',
        receiptNo: `AGN-TEST-${Date.now().toString().slice(-6)}`,
        purchasedAt: new Date().toISOString(),
      });
    }

    const result = await sendEmail(to, subject, html);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || result.error || 'Failed to deliver email through Resend.',
          details: result.error,
          sender: from,
          recipient: to,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email (${type}) successfully sent to ${to}`,
      sender: from,
      recipient: to,
      resendData: result.data,
    });
  } catch (err: any) {
    console.error('[/api/email/test]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while sending test email' },
      { status: 500 }
    );
  }
}
