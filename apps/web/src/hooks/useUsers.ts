/**
 * Social Planner - User Management Hooks
 *
 * TanStack Query hooks for user CRUD operations and role management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UsersResponse {
  items: User[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface UseUsersOptions {
  page?: number | undefined;
  perPage?: number | undefined;
  search?: string | undefined;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

// Query keys
export const userKeys = {
  all: ['users'] as const,
  list: (options: UseUsersOptions) => [...userKeys.all, 'list', options] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  teamMembers: () => [...userKeys.all, 'team-members'] as const,
};

/**
 * Hook to fetch paginated list of users
 */
export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, perPage = 20, search, role } = options;

  return useQuery({
    queryKey: userKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      if (search) params.set('search', search);
      if (role) params.set('role', role);

      const { data } = await api.get<UsersResponse>(`/users?${params}`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch team members for collaboration features
 * Available to all authenticated users (not just admins)
 */
export function useTeamMembers() {
  return useQuery({
    queryKey: userKeys.teamMembers(),
    queryFn: async () => {
      const { data } = await api.get<TeamMember[]>('/users/team-members');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to update a user's role
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    }) => {
      const { data } = await api.patch(`/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User role updated');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User deleted');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}
