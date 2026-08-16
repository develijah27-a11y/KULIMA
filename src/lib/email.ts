import { Resend } from 'resend';

// No-ops silently if Resend isn't configured yet (RESEND_API_KEY / EMAIL_FROM
// not set) — matches how web push (NEXT_PUBLIC_VAPID_PUBLIC_KEY) degrades in
// this codebase, so the rest of the app never depends on email actually
// having been set up.
const apiKey = process.env.RESEND_API_KEY;
const from   = process.env.EMAIL_FROM ?? 'Cropify <onboarding@resend.dev>';
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) return { skipped: true as const };
  try {
    await resend.emails.send({ from, to, subject, html });
    return { skipped: false as const };
  } catch (err) {
    console.error('[sendEmail]', err);
    return { skipped: false as const, error: err };
  }
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
      <td style="padding: 9px 0; color: #6B7280; font-size: 13px; border-top: 1px solid #EEF2EF;">${label}</td>
      <td style="padding: 9px 0; text-align: right; font-weight: 700; font-size: 13px; color: #14251C; border-top: 1px solid #EEF2EF;">${value}</td>
    </tr>`;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #F4F7F5;">
    <div style="padding: 28px 4px 4px;">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 3px rgba(16,24,20,0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #123825 0%, #1F5C3B 55%, #2D8A57 100%); padding: 30px 28px 26px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="display: inline-block; width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,0.16); text-align: center; line-height: 34px; font-weight: 900; font-size: 16px; color: #fff; font-family: Georgia, serif;">A</div>
                </td>
                <td style="vertical-align: middle; padding-left: 10px;">
                  <p style="margin: 0; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.04em;">CROPIFY</p>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.16); color: #D7FBE8; font-size: 10px; font-weight: 800; letter-spacing: 0.05em;">RECEIPT</span>
                </td>
              </tr>
            </table>
            <p style="color: #fff; font-size: 21px; font-weight: 800; margin: 22px 0 4px; letter-spacing: -0.02em;">Purchase confirmed</p>
            <p style="color: rgba(255,255,255,0.72); font-size: 13px; margin: 0;">${dateLabel} · Receipt ${receiptNo}</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 24px 28px 4px;">
            <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">
              Hi ${buyerName}, thanks for shopping on Cropify. Here's your receipt for this order.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding: 18px 28px 0;">
            <div style="background: #F0FAF4; border: 1px solid #D8F0E1; border-radius: 14px; padding: 18px 20px;">
              <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #2D8A57;">Total</p>
              <p style="margin: 0; font-size: 26px; font-weight: 900; color: #123825; letter-spacing: -0.02em;">UGX ${Math.round(amount).toLocaleString()}</p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding: 20px 28px 0;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF;">Order Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Product', productName)}
              ${row('Quantity', `${quantity} ${unit}`)}
              ${row('Unit Price', `UGX ${Math.round(unitPrice).toLocaleString()}`)}
              ${row('Sold By', dealerName)}
              ${district ? row('District', district) : ''}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding: 26px 28px 30px;">
            <p style="font-size: 13px; color: #4B5563; margin: 0 0 18px; line-height: 1.6;">
              Track this order anytime under My Inputs in the app. Thank you for using Cropify.
            </p>
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #EEF2EF; padding-top: 14px;">
              <tr>
                <td style="padding-top: 16px; font-size: 11px; color: #9CA3AF;">Cropify · Grown local, moved fast</td>
                <td style="padding-top: 16px; text-align: right; font-size: 11px; color: #9CA3AF;">www.cropifyapp.com</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="text-align: center; font-size: 11px; color: #9CA3AF; padding: 16px 20px;">
        This is an automated receipt for your Cropify purchase. Receipt ${receiptNo}.
      </p>
    </div>
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
      <td style="padding: 9px 0; color: #6B7280; font-size: 13px; border-top: 1px solid #EEF2EF;">${label}</td>
      <td style="padding: 9px 0; text-align: right; font-weight: 700; font-size: 13px; color: #14251C; border-top: 1px solid #EEF2EF;">${value}</td>
    </tr>`;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #F4F7F5;">
    <div style="padding: 28px 4px 4px;">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 3px rgba(16,24,20,0.06);">

        <!-- Brand header -->
        <tr>
          <td style="background: linear-gradient(135deg, #123825 0%, #1F5C3B 55%, #2D8A57 100%); padding: 30px 28px 26px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="display: inline-block; width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,0.16); text-align: center; line-height: 34px; font-weight: 900; font-size: 16px; color: #fff; font-family: Georgia, serif;">A</div>
                </td>
                <td style="vertical-align: middle; padding-left: 10px;">
                  <p style="margin: 0; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.04em;">CROPIFY</p>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.16); color: #D7FBE8; font-size: 10px; font-weight: 800; letter-spacing: 0.05em;">DELIVERED</span>
                </td>
              </tr>
            </table>
            <p style="color: #fff; font-size: 21px; font-weight: 800; margin: 22px 0 4px; letter-spacing: -0.02em;">Your goods have arrived</p>
            <p style="color: rgba(255,255,255,0.72); font-size: 13px; margin: 0;">${dateLabel} · Receipt ${receiptNo}</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding: 24px 28px 4px;">
            <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">
              Hi ${recipientName}, thank you for trusting Cropify to move your goods. Here's your delivery summary.
            </p>
          </td>
        </tr>

        <!-- Fare hero -->
        <tr>
          <td style="padding: 18px 28px 0;">
            <div style="background: #F0FAF4; border: 1px solid #D8F0E1; border-radius: 14px; padding: 18px 20px;">
              <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #2D8A57;">Total Paid</p>
              <p style="margin: 0; font-size: 26px; font-weight: 900; color: #123825; letter-spacing: -0.02em;">UGX ${Math.round(fare).toLocaleString()}</p>
            </div>
          </td>
        </tr>

        <!-- Route -->
        <tr>
          <td style="padding: 20px 28px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 20px; vertical-align: top; padding-top: 3px;">
                  <div style="width: 9px; height: 9px; border-radius: 50%; background: #2D8A57;"></div>
                  <div style="width: 1px; height: 30px; background: #D8E3DC; margin: 3px auto;"></div>
                  <div style="width: 9px; height: 9px; border-radius: 2px; background: #14251C;"></div>
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF;">${pickedTime ? `Picked up · ${pickedTime}` : 'Pickup'}</p>
                  <p style="margin: 0 0 22px; font-size: 13px; font-weight: 700; color: #14251C;">${pickupLocation ? `${pickupLocation}, ` : ''}${pickupDistrict}</p>
                  <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF;">Delivered · ${deliveredTime}</p>
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #14251C;">${dropoffLocation ? `${dropoffLocation}, ` : ''}${dropoffDistrict}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Details table -->
        <tr>
          <td style="padding: 16px 28px 0;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF;">Delivery Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Cargo', `${cargoKg}kg ${cargoType}`)}
              ${deliveryType ? row('Service', deliveryType.charAt(0).toUpperCase() + deliveryType.slice(1)) : ''}
              ${distanceKm ? row('Distance', `${distanceKm} km`) : ''}
              ${duration ? row('Duration', duration) : ''}
            </table>
          </td>
        </tr>

        ${driverName ? `
        <!-- Driver & vehicle -->
        <tr>
          <td style="padding: 18px 28px 0;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF;">Driver &amp; Vehicle</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Driver', driverName)}
              ${driverPhone ? row('Phone', driverPhone) : ''}
              ${vehicleMakeModel ? row('Vehicle', `${vehicleMakeModel}${vehiclePlate ? ` · ${vehiclePlate}` : ''}`) : ''}
            </table>
          </td>
        </tr>` : ''}

        ${recipientPhone ? `
        <tr>
          <td style="padding: 18px 28px 0;">
            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF;">Recipient</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Name', recipientName)}
              ${row('Phone', recipientPhone)}
            </table>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding: 26px 28px 30px;">
            <p style="font-size: 13px; color: #4B5563; margin: 0 0 18px; line-height: 1.6;">
              We hope your produce arrived in great condition. If anything looks wrong with this delivery, reply to this email or reach us in-app under Support.
            </p>
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #EEF2EF; padding-top: 14px;">
              <tr>
                <td style="padding-top: 16px; font-size: 11px; color: #9CA3AF;">Cropify · Grown local, moved fast</td>
                <td style="padding-top: 16px; text-align: right; font-size: 11px; color: #9CA3AF;">www.cropifyapp.com</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="text-align: center; font-size: 11px; color: #9CA3AF; padding: 16px 20px;">
        This is an automated receipt for a completed Cropify delivery. Receipt ${receiptNo}.
      </p>
    </div>
  </div>
  `;
}

export function resetPasswordEmail(opts: { resetUrl: string; requestedAt: string }) {
  const { resetUrl, requestedAt } = opts;
  const timeLabel = new Date(requestedAt).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' });

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #F4F7F5;">
    <div style="padding: 28px 4px 4px;">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 3px rgba(16,24,20,0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #123825 0%, #1F5C3B 55%, #2D8A57 100%); padding: 30px 28px 26px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="display: inline-block; width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,0.16); text-align: center; line-height: 34px; font-weight: 900; font-size: 16px; color: #fff; font-family: Georgia, serif;">C</div>
                </td>
                <td style="vertical-align: middle; padding-left: 10px;">
                  <p style="margin: 0; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.04em;">CROPIFY</p>
                </td>
              </tr>
            </table>
            <p style="color: #fff; font-size: 21px; font-weight: 800; margin: 22px 0 4px; letter-spacing: -0.02em;">Reset your password</p>
            <p style="color: rgba(255,255,255,0.72); font-size: 13px; margin: 0;">Requested ${timeLabel}, East Africa Time</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 26px 28px 4px;">
            <p style="font-size: 14px; color: #374151; margin: 0 0 20px; line-height: 1.65;">
              We received a request to reset the password on the Cropify account linked to this email address. Tap the button below to choose a new password — this link is valid for one use and expires in 1 hour.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display: inline-block; background: #123825; color: #ffffff; font-size: 14.5px; font-weight: 800; text-decoration: none; padding: 13px 30px; border-radius: 11px; letter-spacing: -0.01em;">
                    Set a new password
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Trust / anti-phishing block — this is the part that answers
             "how do I know this is really Cropify and not a scam". -->
        <tr>
          <td style="padding: 24px 28px 0;">
            <div style="background: #F0FAF4; border: 1px solid #D8F0E1; border-radius: 14px; padding: 16px 18px;">
              <p style="margin: 0 0 8px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #2D8A57;">How to know this is genuinely from us</p>
              <p style="margin: 0; font-size: 12.5px; color: #374151; line-height: 1.65;">
                This email always comes from <strong>${process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'no-reply@cropify.app'}</strong>, and the button above always leads to a page on our own <strong>www.cropifyapp.com</strong> domain — check the address bar after tapping it. Cropify will never ask you for your password, PIN, or OTP by email, call, or SMS. If a message asks for those directly, it isn't us.
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding: 20px 28px 30px;">
            <p style="font-size: 12.5px; color: #6B7280; margin: 0; line-height: 1.65;">
              Didn't request this? No action needed — your password stays unchanged and this link will simply expire. If you're worried someone else is trying to access your account, reach us in-app under Support.
            </p>
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #EEF2EF; margin-top: 18px; padding-top: 14px;">
              <tr>
                <td style="padding-top: 16px; font-size: 11px; color: #9CA3AF;">Cropify · Grown local, moved fast</td>
                <td style="padding-top: 16px; text-align: right; font-size: 11px; color: #9CA3AF;">www.cropifyapp.com</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="text-align: center; font-size: 11px; color: #9CA3AF; padding: 16px 20px;">
        If the button doesn't work, copy and paste this link: <span style="word-break: break-all;">${resetUrl}</span>
      </p>
    </div>
  </div>
  `;
}
