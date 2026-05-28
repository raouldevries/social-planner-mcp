/**
 * Settings Hooks
 *
 * TanStack Query hooks for user settings and profile management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import type { UserRole } from '@/stores/authStore';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  role: UserRole;
  authProvider: 'LOCAL' | 'GOOGLE' | 'MICROSOFT';
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  timezone?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountData {
  password?: string;
  email?: string;
}

export interface UserStats {
  postsCreated: number;
  articlesCreated: number;
  mediaUploaded: number;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  authProvider: 'LOCAL' | 'GOOGLE' | 'MICROSOFT';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserListFilters {
  page?: number;
  perPage?: number;
  search?: string;
  role?: UserRole;
}

export interface UserListResponse {
  data: UserListItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// API returns this structure
interface ApiUserListResponse {
  items: UserListItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

// Defined outside to avoid recreation on each call
const TIMEZONE_LIST: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

// ============================================
// QUERY KEYS
// ============================================

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  stats: () => [...settingsKeys.all, 'stats'] as const,
  users: (filters: UserListFilters) => [...settingsKeys.all, 'users', filters] as const,
  user: (id: string) => [...settingsKeys.all, 'user', id] as const,
};

// ============================================
// PROFILE HOOKS
// ============================================

/**
 * Fetch current user profile with full details
 */
export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: async (): Promise<UserProfile> => {
      const response = await api.get('/users/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
  });
}

/**
 * Update current user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<UserProfile> => {
      const response = await api.patch('/users/me', data);
      return response.data;
    },
    onSuccess: (profile) => {
      // Update profile cache
      queryClient.setQueryData(settingsKeys.profile(), profile);

      // Update auth store with new user data
      setUser({
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        timezone: profile.timezone,
        role: profile.role,
      });

      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}

/**
 * Fetch user statistics
 */
export function useUserStats() {
  return useQuery({
    queryKey: settingsKeys.stats(),
    queryFn: async (): Promise<UserStats> => {
      const response = await api.get('/users/me/stats');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - stats don't change frequently
  });
}

// ============================================
// SECURITY HOOKS
// ============================================

/**
 * Change password for local auth users
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordData): Promise<void> => {
      await api.post('/users/me/change-password', data);
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    },
  });
}

/**
 * Delete current user account
 */
export function useDeleteAccount() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async (data: DeleteAccountData): Promise<void> => {
      await api.delete('/users/me', { data });
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      logout();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to delete account';
      toast.error(message);
    },
  });
}

// ============================================
// ADMIN USER MANAGEMENT HOOKS
// ============================================

/**
 * List all users (admin only)
 */
export function useUsers(filters: UserListFilters = {}) {
  return useQuery({
    queryKey: settingsKeys.users(filters),
    queryFn: async (): Promise<UserListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));
      if (filters.search) params.set('search', filters.search);
      if (filters.role) params.set('role', filters.role);

      const response = await api.get<ApiUserListResponse>(`/users?${params.toString()}`);
      const apiData = response.data;

      // Transform API response to frontend format
      return {
        data: apiData.items,
        pagination: {
          ...apiData.pagination,
          hasMore: apiData.pagination.page < apiData.pagination.totalPages,
        },
      };
    },
    placeholderData: (previousData) => previousData, // Keep previous data during pagination
  });
}

/**
 * Get single user by ID (admin only)
 */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.user(id ?? ''),
    queryFn: async (): Promise<UserListItem> => {
      const response = await api.get(`/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Update user role (admin only)
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }): Promise<UserListItem> => {
      const response = await api.patch(`/users/${userId}/role`, { role });
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Invalidate user list queries
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, 'users'] });

      // Update specific user cache
      queryClient.setQueryData(settingsKeys.user(updatedUser.id), updatedUser);

      toast.success('User role updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to update user role';
      toast.error(message);
    },
  });
}

/**
 * Delete user (admin only)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      // Invalidate user list queries
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, 'users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to delete user';
      toast.error(message);
    },
  });
}

// ============================================
// TIMEZONE UTILITIES
// ============================================

/**
 * Get list of common timezones
 */
export function getTimezones(): { value: string; label: string }[] {
  return TIMEZONE_LIST;
}

/**
 * Validate if a timezone is valid
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
