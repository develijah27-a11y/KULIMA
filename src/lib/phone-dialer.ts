/**
 * Phone Dialer & Contact Utilities for Cropify
 * 
 * Ensures phone numbers for both drivers and requesters are sanitized,
 * formatted to international E.164 telecommunication URI standard (RFC 3966),
 * and immediately autofill directly into the native mobile dialer / phone book.
 */

/**
 * Sanitizes and normalizes phone numbers for the device's native phone dialer.
 * Strips spaces, dashes, dots, and brackets. Converts Ugandan local numbers
 * (e.g. 07XXXXXXXX or 03XXXXXXXX) to international +256 format so that all
 * device dialers (Android, iOS, desktop Softphone) automatically prefill the number.
 */
export function cleanPhoneForDialer(phone: string | null | undefined): string {
  if (!phone) return '';
  // Strip all non-digit and non-plus characters
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  // Ugandan local 10-digit mobile/landline numbers starting with 0 (e.g. 0701234567, 0772123456)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = `+256${cleaned.slice(1)}`;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('256') && cleaned.length === 12) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Returns RFC 3966 compliant tel: URI for anchor tags.
 */
export function getTelUri(phone: string | null | undefined): string {
  const clean = cleanPhoneForDialer(phone);
  return clean ? `tel:${clean}` : '#';
}

/**
 * Returns WhatsApp click-to-chat URL with normalized digits.
 */
export function getWhatsAppUri(phone: string | null | undefined, text?: string): string {
  const clean = cleanPhoneForDialer(phone).replace(/\+/g, '');
  if (!clean) return '#';
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${clean}${encodedText}`;
}

/**
 * Formats a phone number for user-friendly readability on cards and badges.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = cleanPhoneForDialer(phone);
  if (clean.startsWith('+256') && clean.length === 13) {
    // e.g. +256 701 234 567
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 10)} ${clean.slice(10)}`;
  }
  return phone.trim();
}

/**
 * Triggers native device phone dialer with the phone number automatically autofilled into keypad.
 * Prevents event propagation so parent card click handlers don't intercept the call action.
 */
export function openPhoneDialer(phone: string | null | undefined, e?: React.MouseEvent): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const uri = getTelUri(phone);
  if (!uri || uri === '#') return;

  if (typeof window !== 'undefined') {
    // Direct assignment forces mobile browsers and PWAs to hand off
    // immediately to the OS phone dialer app with number pre-entered
    window.location.href = uri;
  }
}
