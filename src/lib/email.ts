import { Resend } from 'resend';

export interface SendEmailResult {
  success: boolean;
  skipped: boolean;
  data?: any;
  error?: any;
}

export function getResendClient(): { client: Resend | null; from: string } {
  const apiKey = process.env.RESEND_API_KEY;
  let from = process.env.EMAIL_FROM || 'Cropify <noreply@cropifyapp.com>';
  const lowerFrom = from.toLowerCase();

  // Strictly enforce Cropify branding and verified cropifyapp.com domain
  if (
    lowerFrom.includes('kulima') ||
    lowerFrom.includes('agrinova') ||
    (!lowerFrom.includes('@cropifyapp.com') && !lowerFrom.includes('@cropify.app'))
  ) {
    from = 'Cropify <noreply@cropifyapp.com>';
  } else if (!from.startsWith('Cropify')) {
    const emailMatch = from.match(/<([^>]+)>/);
    const emailAddr = emailMatch ? emailMatch[1] : from;
    from = `Cropify <${emailAddr}>`;
  }

  if (!apiKey || apiKey === 'REDACTED_REMOVED_FROM_REPO') {
    return { client: null, from };
  }
  return { client: new Resend(apiKey), from };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const { client, from } = getResendClient();
  if (!client) {
    console.warn(`[sendEmail:skipped] RESEND_API_KEY is not configured. Email to "${to}" with subject "${subject}" was skipped.`);
    return { success: false, skipped: true };
  }

  try {
    const { data, error } = await client.emails.send({ from, to, subject, html });
    if (error) {
      console.error(`[sendEmail:error] Resend API error sending to "${to}":`, error);
      return { success: false, skipped: false, error };
    }
    console.log(`[sendEmail:success] Email delivered to "${to}" (id: ${data?.id})`);
    return { success: true, skipped: false, data };
  } catch (err) {
    console.error(`[sendEmail:exception] Exception sending to "${to}":`, err);
    return { success: false, skipped: false, error: err };
  }
}

/** Standard brand header with official Cropify logo and verified domain */
function emailBrandHeader(categoryBadge: string) {
  return `
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; padding: 18px 24px; border-bottom: 1px solid #EEF2EF;">
      <tr>
        <td style="vertical-align: middle;">
          <a href="https://www.cropifyapp.com" target="_blank" style="text-decoration: none; display: inline-block;">
            <img src="https://www.cropifyapp.com/logo.png" width="105" height="auto" alt="Cropify — Inform • Connect • Grow" style="display: block; width: 105px; max-width: 105px; height: auto; border: 0;" />
          </a>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: #F0FAF4; border: 1px solid #DCFCE7; color: #166534; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
            ${categoryBadge}
          </span>
        </td>
      </tr>
    </table>
  `;
}

/** Standard brand footer with verified links and authenticity statement */
function emailBrandFooter(receiptNo?: string) {
  return `
    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #EEF2EF; padding-top: 16px; margin-top: 20px;">
      <tr>
        <td style="vertical-align: middle;">
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #166534;">Cropify Agribusiness Network</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #9CA3AF;">Official platform: <a href="https://www.cropifyapp.com" style="color: #166534; text-decoration: none; font-weight: 600;">cropifyapp.com</a> · Escrow-secured transactions</p>
          ${receiptNo ? `<p style="margin: 2px 0 0; font-size: 10px; color: #9CA3AF;">Reference ID: ${receiptNo}</p>` : ''}
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <img src="https://www.cropifyapp.com/icons/icon-192.png" width="28" height="28" alt="Cropify" style="display: inline-block; width: 28px; height: 28px; border-radius: 7px; vertical-align: middle; border: 1px solid #E5E7EB;" />
        </td>
      </tr>
    </table>
  `;
}

export function purchaseReceiptEmail(opts: {
  buyerName: string;
  dealerName: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  district?: string | null;
  receiptNo: string;
  purchasedAt: string;
}) {
  const { buyerName, dealerName, productName, quantity, unit, unitPrice, amount, district, receiptNo, purchasedAt } = opts;
  const dateLabel = new Date(purchasedAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 10px 0; color: #6B7280; font-size: 13px; border-top: 1px solid #EEF2EF;">${label}</td>
      <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 13px; color: #111827; border-top: 1px solid #EEF2EF;">${value}</td>
    </tr>`;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #F4F7F5; padding: 24px 10px;">
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,20,0.06); border: 1px solid #E5E7EB;">
      
      <!-- Top Logo Bar -->
      <tr>
        <td>
          ${emailBrandHeader('Official Receipt')}
        </td>
      </tr>

      <!-- Hero Header Banner -->
      <tr>
        <td style="background: linear-gradient(135deg, #0F2E1E 0%, #164D31 55%, #1C6B42 100%); padding: 28px 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <span style="display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.18); color: #D1FAE5; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                  Payment Confirmed
                </span>
                <p style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 12px 0 4px; letter-spacing: -0.02em;">
                  Purchase Receipt
                </p>
                <p style="color: rgba(255,255,255,0.78); font-size: 12px; margin: 0;">
                  ${dateLabel} · Receipt #${receiptNo}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting & Purpose -->
      <tr>
        <td style="padding: 22px 24px 6px;">
          <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">
            Dear <strong>${buyerName}</strong>, thank you for your order on Cropify. Your payment has been secured and settled with the agro-dealer.
          </p>
        </td>
      </tr>

      <!-- Amount Callout -->
      <tr>
        <td style="padding: 14px 24px 0;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px 18px;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #166534;">Total Paid (UGX)</p>
            <p style="margin: 0; font-size: 26px; font-weight: 900; color: #064E3B; letter-spacing: -0.02em;">UGX ${Math.round(amount).toLocaleString()}</p>
          </div>
        </td>
      </tr>

      <!-- Order Line Items -->
      <tr>
        <td style="padding: 18px 24px 0;">
          <p style="margin: 0 0 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #9CA3AF;">Transaction Summary</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${row('Product', productName)}
            ${row('Quantity', `${quantity} ${unit}`)}
            ${row('Unit Price', `UGX ${Math.round(unitPrice).toLocaleString()}`)}
            ${row('Merchant / Supplier', dealerName)}
            ${district ? row('Fulfillment District', district) : ''}
            ${row('Status', 'Settled via Escrow')}
          </table>
        </td>
      </tr>

      <!-- Action Button -->
      <tr>
        <td style="padding: 20px 24px 0; text-align: center;">
          <a href="https://www.cropifyapp.com/buyer/orders" style="display: inline-block; background: #123825; color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 11px 24px; border-radius: 10px; letter-spacing: -0.01em;">
            View Order in Cropify →
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 18px 24px 24px;">
          ${emailBrandFooter(receiptNo)}
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 14px;">
      This automated notification was issued by Cropify (cropifyapp.com) for receipt ${receiptNo}.
    </p>
  </div>
  `;
}

function fmtDuration(startIso: string | null, endIso: string) {
  if (!startIso) return null;
  const mins = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
  if (mins < 1) return null;
  if (mins < 60) return `${mins.toFixed(1)} min`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

export function deliveryArrivedEmail(opts: {
  recipientName: string;
  recipientPhone?: string | null;
  cargoType: string;
  cargoKg: number;
  pickupDistrict: string;
  pickupLocation?: string | null;
  dropoffDistrict: string;
  dropoffLocation?: string | null;
  fare: number;
  distanceKm?: number | null;
  deliveryType?: string | null;
  pickedUpAt?: string | null;
  deliveredAt: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleMakeModel?: string | null;
  vehiclePlate?: string | null;
  receiptNo: string;
}) {
  const {
    recipientName, recipientPhone, cargoType, cargoKg,
    pickupDistrict, pickupLocation, dropoffDistrict, dropoffLocation,
    fare, distanceKm, deliveryType, pickedUpAt, deliveredAt,
    driverName, driverPhone, vehicleMakeModel, vehiclePlate, receiptNo,
  } = opts;

  const deliveredDate = new Date(deliveredAt);
  const dateLabel = deliveredDate.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  const pickedTime    = pickedUpAt ? new Date(pickedUpAt).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' }) : null;
  const deliveredTime = deliveredDate.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  const duration = fmtDuration(pickedUpAt ?? null, deliveredAt);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 10px 0; color: #6B7280; font-size: 13px; border-top: 1px solid #EEF2EF;">${label}</td>
      <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 13px; color: #111827; border-top: 1px solid #EEF2EF;">${value}</td>
    </tr>`;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #F4F7F5; padding: 24px 10px;">
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,20,0.06); border: 1px solid #E5E7EB;">
      
      <!-- Top Logo Bar -->
      <tr>
        <td>
          ${emailBrandHeader('Logistics Delivery')}
        </td>
      </tr>

      <!-- Hero Header Banner -->
      <tr>
        <td style="background: linear-gradient(135deg, #0F2E1E 0%, #164D31 55%, #1C6B42 100%); padding: 28px 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <span style="display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.18); color: #D1FAE5; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                  Delivered Successfully
                </span>
                <p style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 12px 0 4px; letter-spacing: -0.02em;">
                  Cargo Delivery Completed
                </p>
                <p style="color: rgba(255,255,255,0.78); font-size: 12px; margin: 0;">
                  ${dateLabel} · Receipt #${receiptNo}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting & Purpose -->
      <tr>
        <td style="padding: 22px 24px 6px;">
          <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">
            Dear <strong>${recipientName}</strong>, your agricultural consignment has been delivered at the scheduled destination. Please find your delivery confirmation summary below.
          </p>
        </td>
      </tr>

      <!-- Fare Paid Callout -->
      <tr>
        <td style="padding: 14px 24px 0;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px 18px;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #166534;">Delivery Fare Settled</p>
            <p style="margin: 0; font-size: 26px; font-weight: 900; color: #064E3B; letter-spacing: -0.02em;">UGX ${Math.round(fare).toLocaleString()}</p>
          </div>
        </td>
      </tr>

      <!-- Transit Route -->
      <tr>
        <td style="padding: 18px 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 20px; vertical-align: top; padding-top: 3px;">
                <div style="width: 9px; height: 9px; border-radius: 50%; background: #16A34A;"></div>
                <div style="width: 1px; height: 28px; background: #CBD5E1; margin: 3px auto;"></div>
                <div style="width: 9px; height: 9px; border-radius: 2px; background: #0F172A;"></div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF;">${pickedTime ? `Origin · ${pickedTime}` : 'Origin Pickup'}</p>
                <p style="margin: 0 0 16px; font-size: 13px; font-weight: 700; color: #111827;">${pickupLocation ? `${pickupLocation}, ` : ''}${pickupDistrict}</p>
                <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF;">Destination · ${deliveredTime}</p>
                <p style="margin: 0; font-size: 13px; font-weight: 700; color: #111827;">${dropoffLocation ? `${dropoffLocation}, ` : ''}${dropoffDistrict}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Logistics Details -->
      <tr>
        <td style="padding: 16px 24px 0;">
          <p style="margin: 0 0 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #9CA3AF;">Logistics Specifications</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${row('Cargo', `${cargoKg}kg ${cargoType}`)}
            ${deliveryType ? row('Logistics Tier', deliveryType.charAt(0).toUpperCase() + deliveryType.slice(1)) : ''}
            ${distanceKm ? row('Transit Distance', `${distanceKm} km`) : ''}
            ${duration ? row('Transit Duration', duration) : ''}
            ${driverName ? row('Assigned Transporter', driverName) : ''}
            ${vehiclePlate ? row('Vehicle Registration', vehiclePlate) : ''}
          </table>
        </td>
      </tr>

      <!-- Action Button -->
      <tr>
        <td style="padding: 22px 24px 0; text-align: center;">
          <a href="https://www.cropifyapp.com/dashboard" style="display: inline-block; background: #123825; color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 11px 24px; border-radius: 10px; letter-spacing: -0.01em;">
            Open Cropify Logistics →
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 18px 24px 24px;">
          ${emailBrandFooter(receiptNo)}
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 14px;">
      This automated receipt was issued by Cropify (cropifyapp.com) for delivery #${receiptNo}.
    </p>
  </div>
  `;
}

export function resetPasswordEmail(opts: { resetUrl: string; requestedAt: string }) {
  const { resetUrl, requestedAt } = opts;
  const timeLabel = new Date(requestedAt).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' });

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #F4F7F5; padding: 24px 10px;">
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,20,0.06); border: 1px solid #E5E7EB;">
      
      <!-- Top Logo Bar -->
      <tr>
        <td>
          ${emailBrandHeader('Security & Authentication')}
        </td>
      </tr>

      <!-- Hero Header Banner -->
      <tr>
        <td style="background: linear-gradient(135deg, #0F2E1E 0%, #164D31 55%, #1C6B42 100%); padding: 28px 24px;">
          <p style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.02em;">
            Reset Your Password
          </p>
          <p style="color: rgba(255,255,255,0.78); font-size: 12px; margin: 0;">
            Requested ${timeLabel} EAT
          </p>
        </td>
      </tr>

      <!-- Body Copy -->
      <tr>
        <td style="padding: 24px 24px 6px;">
          <p style="font-size: 14px; color: #374151; margin: 0 0 20px; line-height: 1.65;">
            We received a request to update the password for your Cropify account on <strong>cropifyapp.com</strong>. Click the secure button below to set a new password. This link is single-use and will expire in 1 hour.
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 6px 0 16px;">
                <a href="${resetUrl}" style="display: inline-block; background: #123825; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 13px 32px; border-radius: 11px; letter-spacing: -0.01em;">
                  Set New Password
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Anti-phishing / Security Notice -->
      <tr>
        <td style="padding: 10px 24px 0;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 15px 18px;">
            <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #166534;">
              Authenticity Verification
            </p>
            <p style="margin: 0; font-size: 12px; color: #374151; line-height: 1.6;">
              This notification strictly originates from <strong>noreply@cropifyapp.com</strong> and directs only to our official domain <strong>www.cropifyapp.com</strong>. Cropify staff will never ask for your password, wallet PIN, or OTP by phone, SMS, or email.
            </p>
          </div>
        </td>
      </tr>

      <!-- Disclaimer & Expiry -->
      <tr>
        <td style="padding: 18px 24px 4px;">
          <p style="font-size: 12px; color: #6B7280; margin: 0; line-height: 1.6;">
            If you did not request this password reset, no action is required. Your account remains secure and this link will expire automatically.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 14px 24px 24px;">
          ${emailBrandFooter()}
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 14px;">
      Direct link: <span style="word-break: break-all;">${resetUrl}</span>
    </p>
  </div>
  `;
}

export function riskAlertEmail(opts: {
  recipientName: string;
  alertTitle: string;
  riskType: string;
  severity: 'High' | 'Medium' | 'Low' | string;
  affectedDistricts: string[];
  summary: string;
  recommendedActions?: string[];
  actionUrl?: string;
}) {
  const {
    recipientName,
    alertTitle,
    riskType,
    severity,
    affectedDistricts,
    summary,
    recommendedActions = [],
    actionUrl = 'https://www.cropifyapp.com/offtaker/risk',
  } = opts;

  const isHigh = severity.toLowerCase() === 'high';
  const isMed  = severity.toLowerCase() === 'medium';

  const bannerBg = isHigh
    ? 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #DC2626 100%)'
    : isMed
      ? 'linear-gradient(135deg, #78350F 0%, #92400E 50%, #D97706 100%)'
      : 'linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)';

  const badgeBg = isHigh ? '#FEE2E2' : isMed ? '#FEF3C7' : '#DCFCE7';
  const badgeColor = isHigh ? '#991B1B' : isMed ? '#92400E' : '#166534';

  const dateLabel = new Date().toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #F4F7F5; padding: 24px 10px;">
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,20,0.06); border: 1px solid #E5E7EB;">
      
      <!-- Top Logo Bar -->
      <tr>
        <td>
          ${emailBrandHeader('Early Risk Warning')}
        </td>
      </tr>

      <!-- Risk Banner -->
      <tr>
        <td style="background: ${bannerBg}; padding: 28px 24px;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; background: ${badgeBg}; color: ${badgeColor}; font-size: 10px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase;">
            ${severity} SEVERITY RISK
          </span>
          <p style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 12px 0 4px; letter-spacing: -0.02em; line-height: 1.3;">
            ${alertTitle}
          </p>
          <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 0;">
            ${riskType} · Dispatched ${dateLabel} EAT
          </p>
        </td>
      </tr>

      <!-- Summary -->
      <tr>
        <td style="padding: 22px 24px 10px;">
          <p style="font-size: 14px; color: #1F2937; margin: 0 0 14px; line-height: 1.6;">
            Dear <strong>${recipientName}</strong>, Cropify agricultural telemetry has identified an active supply chain risk factor impacting scheduled contracts.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 15px 18px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B;">
              Situation Analysis
            </p>
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.6;">
              ${summary}
            </p>
          </div>
        </td>
      </tr>

      <!-- Affected Districts -->
      <tr>
        <td style="padding: 0 24px 14px;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B;">
            Impacted Contract Districts
          </p>
          <div>
            ${affectedDistricts.map(d => `
              <span style="display: inline-block; background: #EEF2F6; color: #1E293B; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; margin-right: 5px; margin-bottom: 5px;">
                ${d}
              </span>
            `).join('')}
          </div>
        </td>
      </tr>

      <!-- Recommended Mitigation Protocol -->
      ${recommendedActions.length > 0 ? `
      <tr>
        <td style="padding: 0 24px 18px;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B;">
            Recommended Mitigation Protocol
          </p>
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 13px 16px;">
            <ul style="margin: 0; padding-left: 18px; color: #92400E; font-size: 13px; line-height: 1.6;">
              ${recommendedActions.map(action => `<li style="margin-bottom: 4px;">${action}</li>`).join('')}
            </ul>
          </div>
        </td>
      </tr>
      ` : ''}

      <!-- CTA Button -->
      <tr>
        <td style="padding: 8px 24px 20px; text-align: center;">
          <a href="${actionUrl}" style="display: inline-block; background: #123825; color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 12px 26px; border-radius: 10px; letter-spacing: -0.01em;">
            Manage Risk on cropifyapp.com →
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 14px 24px 24px;">
          ${emailBrandFooter()}
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 14px;">
      Cropify Agricultural Risk Alert Service · Automated telemetry dispatched to ${recipientName}
    </p>
  </div>
  `;
}


