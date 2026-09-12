/**
 * Admin Security Guard & Culprit Identifier
 *
 * Prevents unauthorized users, test accounts, or attackers using names like
 * "QA Test Admin", "test admin", "admin", etc. from gaining access to administrative
 * dashboards, receiving platform commissions, or spoofing system administrator privileges.
 */

const FORBIDDEN_ADMIN_PATTERNS = [
  /qa\s*test/i,
  /test\s*admin/i,
  /qa\s*admin/i,
  /test\s*administrator/i,
  /dummy\s*admin/i,
  /fake\s*admin/i,
  /sample\s*admin/i,
  /temp\s*admin/i,
  /hacker\s*admin/i,
  /system\s*admin/i,
  /super\s*admin/i,
];

const RESERVED_EXACT_NAMES = new Set([
  'admin',
  'administrator',
  'superadmin',
  'systemadmin',
  'qa admin',
  'qa test admin',
  'test admin',
]);

export function isCulpritAdminName(fullName?: string | null, email?: string | null): boolean {
  const name = (fullName || '').trim().toLowerCase();
  const mail = (email || '').trim().toLowerCase();

  if (RESERVED_EXACT_NAMES.has(name) || RESERVED_EXACT_NAMES.has(mail.split('@')[0])) {
    return true;
  }

  for (const pattern of FORBIDDEN_ADMIN_PATTERNS) {
    if (pattern.test(name) || pattern.test(mail)) {
      return true;
    }
  }

  return false;
}
