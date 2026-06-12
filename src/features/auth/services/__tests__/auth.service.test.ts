/**
 * Authentication Service Unit Tests
 * 
 * Tests for signup, login, logout, and session management functionality.
 * Requirements: 10.1, 10.2, 10.6
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Mock the Supabase server client
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    admin: {
      deleteUser: jest.fn(),
    },
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

// Mock the entire Supabase server module to avoid Next.js cookies() issue
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Import after mocks are set up
import {
  signup,
  login,
  logout,
  getCurrentUser,
  getSession,
  getProfile,
  updateProfile,
  type SignupParams,
  type LoginParams,
} from '../auth.service';

type Profile = Database['public']['Tables']['profiles']['Row'];

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockProfile: Profile = {
      id: 'profile-123',
      user_id: 'user-123',
      full_name: 'Test User',
      phone_number: '+1234567890',
      location: 'Nairobi, Kenya',
      district: null,
      role: 'farmer',
      roles: ['farmer'],
      latitude: null,
      longitude: null,
      primary_crop: null,
      verification_level: null,
      trust_score: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should successfully create user and profile with valid data', async () => {
      const signupParams: SignupParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        location: 'Nairobi, Kenya',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const fromMock = mockSupabaseClient.from('profiles');
      const insertMock = fromMock.insert([]);
      const selectMock = insertMock.select();
      selectMock.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await signup(signupParams);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signupParams.email,
        password: signupParams.password,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');

      expect(result).toEqual({
        user: mockUser,
        profile: mockProfile,
      });
    });

    it('should throw error when auth signup fails', async () => {
      const signupParams: SignupParams = {
        email: 'test@example.com',
        password: 'short',
        fullName: 'Test User',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Password too short'),
      });

      await expect(signup(signupParams)).rejects.toThrow('Password too short');
    });

    it('should rollback auth user when profile creation fails', async () => {
      const signupParams: SignupParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const fromMock = mockSupabaseClient.from('profiles');
      const insertMock = fromMock.insert([]);
      const selectMock = insertMock.select();
      selectMock.single.mockResolvedValue({
        data: null,
        error: new Error('Profile creation failed'),
      });

      await expect(signup(signupParams)).rejects.toThrow('Profile creation failed');

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle optional fields correctly', async () => {
      const signupParams: SignupParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
        // phoneNumber and location omitted
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const fromMock = mockSupabaseClient.from('profiles');
      const insertMock = fromMock.insert([]);
      const selectMock = insertMock.select();
      selectMock.single.mockResolvedValue({
        data: { ...mockProfile, phone_number: null, location: null },
        error: null,
      });

      const result = await signup(signupParams);

      expect(result.user).toEqual(mockUser);
      expect(result.profile.phone_number).toBeNull();
      expect(result.profile.location).toBeNull();
    });
  });

  describe('login', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: mockUser,
    };

    it('should successfully log in with valid credentials', async () => {
      const loginParams: LoginParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await login(loginParams);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: loginParams.email,
        password: loginParams.password,
      });

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
      });
    });

    it('should throw error with invalid credentials', async () => {
      const loginParams: LoginParams = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid login credentials'),
      });

      await expect(login(loginParams)).rejects.toThrow('Invalid login credentials');
    });

    it('should throw error when user is null', async () => {
      const loginParams: LoginParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: mockSession },
        error: null,
      });

      await expect(login(loginParams)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when session is null', async () => {
      const loginParams: LoginParams = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      await expect(login(loginParams)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should successfully log out user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      await expect(logout()).resolves.not.toThrow();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when logout fails', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: new Error('Logout failed'),
      });

      await expect(logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('getCurrentUser', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should return current user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication error'),
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getSession', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: mockUser,
    };

    it('should return current session when authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await getSession();

      expect(result).toEqual(mockSession);
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it('should return null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await getSession();

      expect(result).toBeNull();
    });

    it('should return null when error occurs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    const mockProfile: Profile = {
      id: 'profile-123',
      user_id: 'user-123',
      full_name: 'Test User',
      phone_number: '+1234567890',
      location: 'Nairobi, Kenya',
      district: null,
      role: 'farmer',
      roles: ['farmer'],
      latitude: null,
      longitude: null,
      primary_crop: null,
      verification_level: null,
      trust_score: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return profile when found', async () => {
      const fromMock = mockSupabaseClient.from('profiles');
      const selectMock = fromMock.select('*');
      const eqMock = selectMock.eq('user_id', 'user-123');
      eqMock.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await getProfile('user-123');

      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile not found', async () => {
      const fromMock = mockSupabaseClient.from('profiles');
      const selectMock = fromMock.select('*');
      const eqMock = selectMock.eq('user_id', 'user-123');
      eqMock.single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const result = await getProfile('user-123');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const mockProfile: Profile = {
      id: 'profile-123',
      user_id: 'user-123',
      full_name: 'Updated User',
      phone_number: '+9876543210',
      location: 'Kampala, Uganda',
      district: null,
      role: 'farmer',
      roles: ['farmer'],
      latitude: null,
      longitude: null,
      primary_crop: null,
      verification_level: null,
      trust_score: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    it('should successfully update profile', async () => {
      const updates = {
        fullName: 'Updated User',
        phoneNumber: '+9876543210',
        location: 'Kampala, Uganda',
      };

      const fromMock = mockSupabaseClient.from('profiles');
      const updateMock = fromMock.update({});
      const eqMock = updateMock.eq('user_id', 'user-123');
      const selectMock = eqMock.select();
      selectMock.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await updateProfile('user-123', updates);

      expect(result).toEqual(mockProfile);
    });

    it('should throw error when update fails', async () => {
      const updates = {
        fullName: 'Updated User',
      };

      const fromMock = mockSupabaseClient.from('profiles');
      const updateMock = fromMock.update({});
      const eqMock = updateMock.eq('user_id', 'user-123');
      const selectMock = eqMock.select();
      selectMock.single.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      await expect(updateProfile('user-123', updates)).rejects.toThrow('Update failed');
    });

    it('should handle partial updates', async () => {
      const updates = {
        fullName: 'Updated User',
        // phoneNumber and location not updated
      };

      const fromMock = mockSupabaseClient.from('profiles');
      const updateMock = fromMock.update({});
      const eqMock = updateMock.eq('user_id', 'user-123');
      const selectMock = eqMock.select();
      selectMock.single.mockResolvedValue({
        data: { ...mockProfile, full_name: 'Updated User' },
        error: null,
      });

      const result = await updateProfile('user-123', updates);

      expect(result.full_name).toBe('Updated User');
    });
  });
});
