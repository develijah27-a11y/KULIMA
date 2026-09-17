import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileService, type ProfileWithRoles } from '@/services/profile.service';
import { getTimeGreeting } from '@/lib/greeting';
import { logSystemEvent } from '@/lib/system-log';

export interface AuthenticatedRoleSession {
  user: { id: string; email?: string };
  profile: {
    id?: string;
    name: string;
    role: string;
    verification_level?: string | null;
  };
  roles: string[];
  unreadCount: number;
  greeting: string;
  location: string;
  rawProfile: ProfileWithRoles;
}

export interface RequireRoleOptions {
  allowAdmin?: boolean;
  roleDisplayName?: string;
}

/**
 * Enterprise Authentication & Role Authorization Orchestrator.
 * 
 * Replaces ~80 lines of duplicate boilerplate in every role layout with a single,
 * strongly-typed, secure, and audited session resolver.
 */
export async function requireRoleSession(
  requiredRole: string,
  options: RequireRoleOptions = {}
): Promise<AuthenticatedRoleSession> {
  const { allowAdmin = true, roleDisplayName } = options;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const rawProfile = await ProfileService.getProfileByUserId(user.id);
  if (!rawProfile) {
    redirect('/onboarding/role');
  }

  const userRoles = rawProfile.roles ?? [rawProfile.role];
  const primaryRole = rawProfile.role;
  const isAdmin = allowAdmin && (primaryRole === 'admin' || userRoles.includes('admin'));
  const hasRequiredRole = userRoles.includes(requiredRole) || primaryRole === requiredRole;

  if (!hasRequiredRole && !isAdmin) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'warn',
      route: `/${requiredRole}`,
      userId: user.id,
      message: `Role mismatch: user without ${requiredRole} role attempted /${requiredRole}`,
    });
    redirect('/dashboard');
  }

  // Count unread notifications for this user/role
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .or(`role.eq.${requiredRole},role.is.null`);

  const displayName = rawProfile.full_name?.trim() || roleDisplayName || 'there';
  const firstName = displayName.split(' ')[0] ?? 'there';
  const greeting = getTimeGreeting(firstName);
  const location = rawProfile.location ?? rawProfile.district ?? '';

  return {
    user: { id: user.id, email: user.email },
    profile: {
      id: rawProfile.id,
      name: displayName,
      role: roleDisplayName || primaryRole,
      verification_level: rawProfile.verification_level,
    },
    roles: userRoles,
    unreadCount: unreadCount ?? 0,
    greeting,
    location,
    rawProfile,
  };
}
