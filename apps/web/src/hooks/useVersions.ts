/**
 * Social Planner - Version Hooks
 *
 * TanStack Query hooks for post version history operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import { postKeys } from './usePost';

// ============================================
// TYPES
// ============================================

export interface PostVersionSummary {
  id: string;
  version: number;
  content: string | null;
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  isCurrent: boolean;
}

export interface RestoreResult {
  post: {
    id: string;
    baseContent: string | null;
    updatedAt: string;
  };
  newVersion: PostVersionSummary;
}

// ============================================
// QUERY KEYS
// ============================================

export const versionKeys = {
  all: ['versions'] as const,
  lists: () => [...versionKeys.all, 'list'] as const,
  list: (postId: string) => [...versionKeys.lists(), postId] as const,
  detail: (versionId: string) => [...versionKeys.all, 'detail', versionId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all versions for a post
 */
export function usePostVersions(postId: string | undefined) {
  return useQuery({
    queryKey: versionKeys.list(postId!),
    queryFn: async () => {
      const { data } = await api.get<PostVersionSummary[]>(`/posts/${postId}/versions`);
      return data;
    },
    enabled: !!postId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Fetch a single version by ID
 */
export function useVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: versionKeys.detail(versionId!),
    queryFn: async () => {
      const { data } = await api.get<PostVersionSummary>(`/versions/${versionId}`);
      return data;
    },
    enabled: !!versionId,
    staleTime: 1000 * 30,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Restore a previous version
 */
export function useRestoreVersion(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post<RestoreResult>(`/versions/${versionId}/restore`);
      return data;
    },
    onSuccess: () => {
      // Invalidate versions list and post detail
      queryClient.invalidateQueries({ queryKey: versionKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      toast.success('Version restored');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}
