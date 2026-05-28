/**
 * Social Planner - Analytics Hooks
 *
 * TanStack Query hooks for analytics data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalyticsDashboard, PostAnalyticsDetail, SocialPlatform } from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

export interface AnalyticsFilters {
  fromDate: string;
  toDate: string;
  platform?: SocialPlatform | undefined;
}

export type DateRangePreset = 'last7days' | 'last30days' | 'last90days' | 'ytd' | 'custom';

// ============================================
// QUERY KEYS
// ============================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'dashboard', filters] as const,
  post: (postId: string) => [...analyticsKeys.all, 'post', postId] as const,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (preset) {
    case 'last7days': {
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'last30days': {
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'last90days': {
      const from = new Date(to);
      from.setDate(from.getDate() - 89);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'ytd': {
      const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      return { from, to };
    }
    default:
      return { from: to, to };
  }
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch analytics dashboard data
 */
export function useAnalyticsDashboard(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(filters),
    queryFn: async (): Promise<AnalyticsDashboard> => {
      const params: Record<string, string> = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      };

      if (filters.platform) {
        params.platform = filters.platform;
      }

      const { data } = await api.get<AnalyticsDashboard>('/analytics', { params });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch analytics for a specific post
 */
export function usePostAnalytics(postId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.post(postId ?? ''),
    queryFn: async (): Promise<PostAnalyticsDetail> => {
      const { data } = await api.get<PostAnalyticsDetail>(`/analytics/posts/${postId}`);
      return data;
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// SYNC MUTATIONS
// ============================================

interface SyncResult {
  channelId: string;
  success: boolean;
  error?: string;
}

interface SyncPostResponse {
  message: string;
  results: SyncResult[];
}

/**
 * Hook to manually sync analytics for a specific post
 */
export function useSyncPostAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string): Promise<SyncPostResponse> => {
      const { data } = await api.post<SyncPostResponse>(`/analytics-sync/post/${postId}`);
      return data;
    },
    onSuccess: (_, postId) => {
      // Invalidate analytics queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: analyticsKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
