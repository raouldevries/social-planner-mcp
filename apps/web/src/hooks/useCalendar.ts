/**
 * Social Planner - Calendar Hooks
 *
 * TanStack Query hooks for calendar data fetching and post scheduling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import type { PostSummary, ArticleSummary, PaginatedResponse } from '@social-planner/shared';

// Query keys
export const calendarKeys = {
  all: ['calendar'] as const,
  posts: (filters: CalendarFilters) => [...calendarKeys.all, 'posts', filters] as const,
  articles: (filters: CalendarFilters) => [...calendarKeys.all, 'articles', filters] as const,
};

export interface CalendarFilters {
  from: string; // ISO date string
  to: string; // ISO date string
  status?: string[] | undefined;
  platform?: string | undefined;
  authorId?: string | undefined;
}

/**
 * Hook to fetch posts for calendar display
 */
export function useCalendarPosts(filters: CalendarFilters) {
  return useQuery({
    queryKey: calendarKeys.posts(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('fromDate', filters.from);
      params.set('toDate', filters.to);
      params.set('perPage', '500'); // Get all posts in date range

      if (filters.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }
      if (filters.platform) {
        params.set('platform', filters.platform);
      }
      if (filters.authorId) {
        params.set('authorId', filters.authorId);
      }

      const { data } = await api.get<PaginatedResponse<PostSummary>>(`/posts?${params.toString()}`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for rescheduling a post via drag-and-drop
 */
export function useReschedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, scheduledAt }: { postId: string; scheduledAt: string }) => {
      const { data } = await api.post(`/posts/${postId}/schedule`, { scheduledAt });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Post rescheduled');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for unscheduling a post
 */
export function useUnschedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await api.post(`/posts/${postId}/unschedule`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Post unscheduled');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

// ============================================
// ARTICLE HOOKS
// ============================================

/**
 * Hook to fetch articles for calendar display
 */
export function useCalendarArticles(filters: CalendarFilters) {
  return useQuery({
    queryKey: calendarKeys.articles(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('fromDate', filters.from);
      params.set('toDate', filters.to);
      params.set('perPage', '500'); // Get all articles in date range

      if (filters.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }
      if (filters.authorId) {
        params.set('authorId', filters.authorId);
      }

      const { data } = await api.get<PaginatedResponse<ArticleSummary>>(
        `/articles?${params.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for rescheduling an article via drag-and-drop
 */
export function useRescheduleArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      articleId,
      plannedAt,
    }: {
      articleId: string;
      plannedAt: string | null;
    }) => {
      const { data } = await api.patch(`/articles/${articleId}/reschedule`, { plannedAt });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article rescheduled');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
