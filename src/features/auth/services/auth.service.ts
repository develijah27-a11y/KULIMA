/**
 * Authentication Service
 * 
 * Handles user authentication operations including signup, login, logout,
 * and session management using Supabase Auth.
 * 
 * Requirements: 10.1, 10.2, 10.6, 10.7
 */

import { createClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Signup parameters
 */
export interface SignupParams {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  location?: string;
}

/**
 * Signup result
 */
export interface SignupResult {
  user: User;
  profile: Profile;
}

/**
 * Login parameters
 */
export interface LoginParams {
  email: string;
  password: string;
}

/**
 * Login result
 */
export interface LoginResult {
  user: User;
  session: Session;
}

/**
 * Sign up a new user and create their profile
 * 
 * @param params - Signup parameters (email, password, fullName, etc.)
 * @returns User and profile data
 * @throws Error if signup fails
 */
export async function signup(params: SignupParams): Promise<SignupResult> {
  const { email, password, fullName, phoneNumber, location } = params;

  const supabase = await createClient();

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw authError || new Error('Failed to create user');
  }

  // Create profile record
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authData.user.id,
      full_name: fullName,
      phone_number: phoneNumber || null,
      location: location || null,
    })
    .select()
    .single();

  if (profileError || !profileData) {
    // Rollback: Delete the auth user if profile creation fails
    // Note: In production, this should be handled by database triggers
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw profileError || new Error('Failed to create profile');
  }

  return {
    user: authData.user,
    profile: profileData,
  };
}

/**
 * Log in an existing user
 * 
 * @param params - Login parameters (email, password)
 * @returns User and session data
 * @throws Error if login fails
 */
export async function login(params: LoginParams): Promise<LoginResult> {
  const { email, password } = params;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw error || new Error('Invalid credentials');
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Log out the current user
 * 
 * @throws Error if logout fails
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Get the current authenticated user
 * 
 * @returns Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current session
 * 
 * @returns Current session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Get user profile by user ID
 * 
 * @param userId - User ID
 * @returns User profile or null if not found
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update user profile
 * 
 * @param userId - User ID
 * @param updates - Profile fields to update
 * @returns Updated profile
 * @throws Error if update fails
 */
export async function updateProfile(
  userId: string,
  updates: {
    fullName?: string;
    phoneNumber?: string;
    location?: string;
  }
): Promise<Profile> {
  const supabase = await createClient();

  const updateData: any = {};
  if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
  if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
  if (updates.location !== undefined) updateData.location = updates.location;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to update profile');
  }

  return data;
}
