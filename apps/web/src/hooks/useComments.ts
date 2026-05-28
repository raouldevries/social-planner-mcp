/**
 * Social Planner - Comment Hooks
 *
 * TanStack Query hooks for comment CRUD operations, threading, and mentions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

export interface CommentAuthor {
  id: string | null;
  fullName: string;
  avatarUrl: string | null;
  isExternal: boolean;
}

export interface CommentSummary {
  id: string;
  postId: string;
  content: string;
  author: CommentAuthor;
  parentId: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  mentions: Array<{ id: string; fullName: string }>;
}

export interface CommentThread extends CommentSummary {
  replies: CommentSummary[];
}

export interface CommentListResult {
  items: CommentThread[];
  total: number;
}

export interface CommentCounts {
  total: number;
  unresolved: number;
}

export interface CreateCommentInput {
  content: string;
  parentId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (postId: string) => [...commentKeys.lists(), postId] as const,
  counts: (postId: string) => [...commentKeys.all, 'counts', postId] as const,
  detail: (commentId: string) => [...commentKeys.all, 'detail', commentId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all comments for a post (threaded structure)
 */
export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.list(postId!),
    queryFn: async () => {
      const { data } = await api.get<CommentListResult>(`/posts/${postId}/comments`);
      return data.items;
    },
    enabled: !!postId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Fetch comment counts (total and unresolved)
 */
export function useCommentCounts(postId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.counts(postId!),
    queryFn: async () => {
      const { data } = await api.get<CommentCounts>(`/posts/${postId}/comments/count`);
      return data;
    },
    enabled: !!postId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new comment on a post
 */
export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const { data } = await api.post<CommentSummary>(`/posts/${postId}/comments`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.counts(postId) });
      toast.success('Comment added');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Update an existing comment
 */
export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { data } = await api.patch<CommentSummary>(`/comments/${commentId}`, { content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      toast.success('Comment updated');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.counts(postId) });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Toggle resolved status on a comment
 */
export function useResolveComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await api.post<CommentSummary>(`/comments/${commentId}/resolve`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.counts(postId) });
      toast.success(data.isResolved ? 'Comment resolved' : 'Comment unresolved');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}
