/**
 * District normalization and matching utilities.
 * Handles casing differences (e.g. 'Kampala' vs 'kampala'),
 * trailing/leading whitespace, and common suffixes (e.g. 'Kampala District' vs 'Kampala').
 */

export function normalizeDistrict(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/\b(district|city|municipality|division|region|sub-county)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Compares two district strings in a case-insensitive, whitespace-insensitive,
 * and suffix-tolerant manner.
 * If either district is empty/null, returns true so optional location fields don't block users.
 */
export function areDistrictsEqual(d1?: string | null, d2?: string | null): boolean {
  const n1 = normalizeDistrict(d1);
  const n2 = normalizeDistrict(d2);
  if (!n1 || !n2) return true;
  return n1 === n2;
}

/**
 * Extracts the user's district or location from a profile object, checking
 * both `location` and `district` fields.
 */
export function getProfileDistrict(profile: any): string {
  if (!profile) return '';
  const loc = profile.location ?? profile.district ?? profile.region ?? '';
  return typeof loc === 'string' ? loc.trim() : '';
}
