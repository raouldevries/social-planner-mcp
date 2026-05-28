/**
 * Social Planner - Share Link Hooks
 *
 * TanStack Query hooks for share link operations.
 * Includes both authenticated (management) and public (access) hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

export interface ShareLink {
  id: string;
  token: string;
  postId: string | null;
  calendarShare: boolean;
  month: string | null;
  hasPassword: boolean;
  permissions: 'VIEW' | 'VIEW_COMMENT';
  expiresAt: string;
  createdAt: string;
  url: string;
}

export interface SharedComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string | null;
    fullName: string;
    avatarUrl: string | null;
  };
  isExternal: boolean;
}

export interface SharedPostData {
  id: string;
  baseContent: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  media: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    fileType: string;
    altText: string | null;
  }>;
  channels: Array<{
    platform: string;
    accountName: string;
    scheduledAt: string | null;
  }>;
  commentCount: number;
  comments: SharedComment[];
}

export interface SharedCalendarData {
  month: string;
  posts: SharedPostData[];
  permissions: 'VIEW' | 'VIEW_COMMENT';
}

export interface ShareLinkAccessResult {
  type: 'post' | 'calendar';
  permissions: 'VIEW' | 'VIEW_COMMENT';
  requiresPassword: boolean;
  post?: SharedPostData;
  calendar?: SharedCalendarData;
}

export interface ShareLinkMeta {
  requiresPassword: boolean;
  type: 'post' | 'calendar';
  expired: boolean;
}

export interface CreateShareLinkInput {
  postId?: string;
  calendarShare?: boolean;
  month?: string;
  expiresInHours: number;
  permissions: 'VIEW' | 'VIEW_COMMENT';
  password?: string;
}

export interface ExternalCommentInput {
  postId: string;
  name: string;
  email: string;
  content: string;
  parentId?: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const shareLinkKeys = {
  all: ['shareLinks'] as const,
  lists: () => [...shareLinkKeys.all, 'list'] as const,
  userList: () => [...shareLinkKeys.lists(), 'user'] as const,
  postList: (postId: string) => [...shareLinkKeys.lists(), 'post', postId] as const,
  access: (token: string, month?: string) =>
    [...shareLinkKeys.all, 'access', token, month] as const,
  meta: (token: string) => [...shareLinkKeys.all, 'meta', token] as const,
};

// ============================================
// AUTHENTICATED HOOKS (Manage share links)
// ============================================

/**
 * Create a share link for a post
 */
export function useCreatePostShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, ...data }: CreateShareLinkInput & { postId: string }) => {
      const { data: shareLink } = await api.post<ShareLink>(`/posts/${postId}/share-links`, data);
      return shareLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.postList(variables.postId) });
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.userList() });
      toast.success('Share link created');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

export interface SendReviewRequestInput {
  postId: string;
  recipientEmail: string;
  message?: string;
}

/**
 * Send a review request email (creates share link + sends email)
 */
export function useSendReviewRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, ...data }: SendReviewRequestInput) => {
      const { data: shareLink } = await api.post<ShareLink>(
        `/posts/${postId}/review-request`,
        data
      );
      return shareLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.postList(variables.postId) });
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.userList() });
      toast.success('Review request sent');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Create a share link for calendar view
 */
export function useCreateCalendarShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<CreateShareLinkInput, 'postId' | 'calendarShare'> & { month: string }
    ) => {
      const { data: shareLink } = await api.post<ShareLink>('/calendar/share-links', {
        ...data,
        calendarShare: true,
      });
      return shareLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.userList() });
      toast.success('Calendar share link created');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * List share links for a specific post
 */
export function usePostShareLinks(postId: string) {
  return useQuery({
    queryKey: shareLinkKeys.postList(postId),
    queryFn: async () => {
      const { data } = await api.get<ShareLink[]>(`/posts/${postId}/share-links`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * List all share links created by current user
 */
export function useUserShareLinks() {
  return useQuery({
    queryKey: shareLinkKeys.userList(),
    queryFn: async () => {
      const { data } = await api.get<ShareLink[]>('/share-links');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Delete a share link
 */
export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`/share-links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.all });
      toast.success('Share link deleted');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

// ============================================
// PUBLIC HOOKS (Access shared content)
// ============================================

// Use a separate axios instance for public endpoints (no auth token)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get share link metadata (check if password required)
 */
export function useShareLinkMeta(token: string) {
  return useQuery({
    queryKey: shareLinkKeys.meta(token),
    queryFn: async () => {
      const { data } = await publicApi.get<ShareLinkMeta>(`/share/${token}/meta`);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!token,
  });
}

/**
 * Access shared content (without password)
 */
export function useShareLinkAccess(token: string, month?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shareLinkKeys.access(token, month),
    queryFn: async () => {
      const params = month ? `?month=${month}` : '';
      const { data } = await publicApi.get<ShareLinkAccessResult>(`/share/${token}${params}`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: options?.enabled !== false && !!token,
    retry: false, // Don't retry on password-protected links
  });
}

/**
 * Verify password and access shared content
 */
export function useShareLinkVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      password,
      month,
    }: {
      token: string;
      password: string;
      month?: string;
    }) => {
      const params = month ? `?month=${month}` : '';
      const { data } = await publicApi.post<ShareLinkAccessResult>(
        `/share/${token}/verify${params}`,
        { password }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Cache the result for future access
      queryClient.setQueryData(shareLinkKeys.access(variables.token, variables.month), data);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error('Invalid password');
      } else if (axios.isAxiosError(error) && error.response?.data) {
        const message =
          (error.response.data as { message?: string }).message || 'An error occurred';
        toast.error(message);
      } else {
        toast.error('An error occurred');
      }
    },
  });
}

/**
 * Add external comment via share link
 */
export function useExternalComment(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExternalCommentInput & { authorName: string }) => {
      const { authorName, ...submitData } = data;
      const { data: comment } = await publicApi.post<{ id: string; createdAt: string }>(
        `/share/${token}/comments`,
        submitData
      );
      return { ...comment, authorName };
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...shareLinkKeys.all, 'access', token] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData<ShareLinkAccessResult>({
        queryKey: [...shareLinkKeys.all, 'access', token],
      });

      // Optimistically update to the new value
      queryClient.setQueriesData<ShareLinkAccessResult>(
        { queryKey: [...shareLinkKeys.all, 'access', token] },
        (old) => {
          if (!old) return old;

          const newComment: SharedComment = {
            id: `temp-${Date.now()}`,
            content: variables.content,
            createdAt: new Date().toISOString(),
            author: {
              id: null,
              fullName: variables.authorName,
              avatarUrl: null,
            },
            isExternal: true,
          };

          if (old.post && old.post.id === variables.postId) {
            return {
              ...old,
              post: {
                ...old.post,
                comments: [...(old.post.comments || []), newComment],
                commentCount: old.post.commentCount + 1,
              },
            };
          }

          if (old.calendar?.posts) {
            return {
              ...old,
              calendar: {
                ...old.calendar,
                posts: old.calendar.posts.map((post) =>
                  post.id === variables.postId
                    ? {
                        ...post,
                        comments: [...(post.comments || []), newComment],
                        commentCount: post.commentCount + 1,
                      }
                    : post
                ),
              },
            };
          }

          return old;
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      // Invalidate all access queries for this token to get server data
      queryClient.invalidateQueries({
        queryKey: [...shareLinkKeys.all, 'access', token],
        exact: false,
      });
      toast.success('Feedback added');
    },
    onError: (error, _, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      if (axios.isAxiosError(error) && error.response?.data) {
        const message =
          (error.response.data as { message?: string }).message || 'Failed to add feedback';
        toast.error(message);
      } else {
        toast.error('Failed to add feedback');
      }
    },
  });
}

export interface ExternalApprovalInput {
  postId: string;
  name: string;
  email: string;
}

/**
 * Approve a post via share link (external reviewer)
 */
export function useExternalApproval(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExternalApprovalInput) => {
      const { data: result } = await publicApi.post<{ success: boolean; postId: string }>(
        `/share/${token}/approve`,
        data
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate the access query to refresh post status
      queryClient.invalidateQueries({ queryKey: shareLinkKeys.access(token, undefined) });
      toast.success('Post approved successfully');
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data) {
        const message =
          (error.response.data as { message?: string }).message || 'Failed to approve post';
        toast.error(message);
      } else {
        toast.error('Failed to approve post');
      }
    },
  });
}
