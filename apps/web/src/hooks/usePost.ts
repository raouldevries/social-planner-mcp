/**
 * Social Planner - Post Hooks
 *
 * TanStack Query hooks for post CRUD operations, status workflow, and scheduling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '@/lib/api';
import { calendarKeys } from '@/hooks/useCalendar';
import toast from 'react-hot-toast';
import type {
  PostSummary,
  PostDetail,
  CreatePostRequest,
  UpdatePostRequest,
  SchedulePostRequest,
  RejectPostRequest,
  PaginatedResponse,
  SocialAccountSummary,
} from '@social-planner/shared';

// Query keys
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  accounts: () => [...postKeys.all, 'accounts'] as const,
};

export interface PostFilters {
  status?: string | undefined;
  platform?: string | undefined;
  authorId?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

/**
 * Hook to fetch paginated list of posts
 */
export function usePosts(filters: PostFilters = {}) {
  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.status) params.set('status', filters.status);
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.authorId) params.set('authorId', filters.authorId);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const { data } = await api.get<PaginatedResponse<PostSummary>>(`/posts?${params.toString()}`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch a single post by ID
 */
export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: postKeys.detail(id!),
    queryFn: async () => {
      const { data } = await api.get<PostDetail>(`/posts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch available social accounts
 */
export function useSocialAccounts() {
  return useQuery({
    queryKey: postKeys.accounts(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SocialAccountSummary>>(
        '/social-accounts?perPage=100'
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new post
 * @param options.silent - If true, don't show toast or navigate (for autosave)
 */
export function useCreatePost(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: async (data: CreatePostRequest) => {
      const { data: post } = await api.post<PostDetail>('/posts', data);
      return post;
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      if (!silent) {
        toast.success('Post created');
        navigate(`/posts/${post.id}`);
      }
    },
    onError: (error) => {
      if (!silent) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
      }
    },
  });
}

/**
 * Hook to update an existing post
 */
export function useUpdatePost(id: string, options?: { silent?: boolean }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePostRequest) => {
      const { data: post } = await api.patch<PostDetail>(`/posts/${id}`, data);
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      if (!options?.silent) {
        toast.success('Post saved');
      }
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete a post
 * @param options.redirectTo - Optional path to navigate to after deletion (defaults to '/calendar')
 */
export function useDeletePost(options?: { redirectTo?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const redirectTo = options?.redirectTo ?? '/calendar';

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/posts/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Post deleted');
      navigate(redirectTo);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to submit a post for approval
 */
export function useSubmitPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: post } = await api.post<PostDetail>(`/posts/${id}/submit`);
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('Post submitted for approval');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to approve a post (Admin only)
 */
export function useApprovePost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: post } = await api.post<PostDetail>(`/posts/${id}/approve`);
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('Post approved');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to reject a post (Admin only)
 */
export function useRejectPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RejectPostRequest) => {
      const { data: post } = await api.post<PostDetail>(`/posts/${id}/reject`, data);
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('Post rejected');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to schedule a post
 */
export function useSchedulePost(
  id: string,
  options?: { silent?: boolean; skipCacheUpdate?: boolean }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SchedulePostRequest) => {
      const { data: post } = await api.post<PostDetail>(`/posts/${id}/schedule`, data);
      return post;
    },
    onSuccess: (post) => {
      if (!options?.skipCacheUpdate) {
        queryClient.setQueryData(postKeys.detail(id), post);
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      }
      if (!options?.silent) {
        toast.success('Post scheduled');
      }
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to publish a post immediately (queue all channels for publishing)
 */
export function usePublishPostNow(id: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/scheduler/posts/${id}/publish`);
      return data;
    },
    // Don't invalidate cache here — the post is SCHEDULED on the server while
    // the worker publishes async. We don't want the UI to show "Scheduled".
    // The PostEditor will poll for status updates instead.
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to unschedule a post
 */
export function useUnschedulePost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: post } = await api.post<PostDetail>(`/posts/${id}/unschedule`);
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Post unscheduled');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to add a collaborator to a post
 */
export function useAddCollaborator(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: post } = await api.post<PostDetail>(`/posts/${postId}/collaborators`, {
        userId,
      });
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(postId), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('Collaborator added');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to remove a collaborator from a post
 */
export function useRemoveCollaborator(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: post } = await api.delete<PostDetail>(
        `/posts/${postId}/collaborators/${userId}`
      );
      return post;
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(postId), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('Collaborator removed');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
