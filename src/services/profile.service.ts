import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface ProfileWithRoles extends ProfileRow {
  role_verification_levels?: Record<string, string> | null;
}

/**
 * Domain Service for Profiles.
 * Centralizes profile fetching, caching, and role management across the application.
 */
export class ProfileService {
  /**
   * Retrieves profile by Supabase auth user_id.
   * Cached per request using React cache() for instant repeated reads across layout, page, and subcomponents.
   */
  static getProfileByUserId = cache(async (userId: string): Promise<ProfileWithRoles | null> => {
    if (!userId) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileService.getProfileByUserId] error:', error);
      return null;
    }

    return (data as unknown as ProfileWithRoles) ?? null;
  });

  /**
   * Retrieves profile by profile table id (UUID primary key).
   */
  static getProfileById = cache(async (profileId: string): Promise<ProfileWithRoles | null> => {
    if (!profileId) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileService.getProfileById] error:', error);
      return null;
    }

    return (data as unknown as ProfileWithRoles) ?? null;
  });

  /**
   * Adds a role to the user's roles array if not already present.
   */
  static async addRole(userId: string, newRole: string): Promise<{ success: boolean; roles: string[]; error?: string }> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) {
      return { success: false, roles: [], error: 'Profile not found' };
    }

    const currentRoles: string[] = profile.roles ?? [];
    if (currentRoles.includes(newRole)) {
      return { success: true, roles: currentRoles };
    }

    const updatedRoles = [...currentRoles, newRole];
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ roles: updatedRoles, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[ProfileService.addRole] error:', updateError);
      return { success: false, roles: currentRoles, error: 'Database update failed' };
    }

    return { success: true, roles: updatedRoles };
  }

  /**
   * Updates profile fields for a user.
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Database['public']['Tables']['profiles']['Update']>
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('[ProfileService.updateProfile] error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
