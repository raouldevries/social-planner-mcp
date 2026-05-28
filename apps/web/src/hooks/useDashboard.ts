/**
 * Dashboard Hooks
 *
 * TanStack Query hooks for fetching dashboard data.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export interface PostStats {
  draft: number;
  pendingApproval: number;
  approved: number;
  scheduled: number;
  published: number;
  rejected: number;
  unpublished: number;
  total: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  details: unknown;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  post?: {
    id: string;
    baseContent: string | null;
  } | null;
  article?: {
    id: string;
    title: string;
  } | null;
}

export interface UpcomingPost {
  id: string;
  baseContent: string | null;
  scheduledAt: string;
  status: string;
  channels: {
    platform: string;
    accountName: string;
  }[];
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface DashboardData {
  postStats: PostStats;
  recentActivity: RecentActivity[];
  upcomingPosts: UpcomingPost[];
  publishedThisWeek: number;
  pendingApprovalCount: number;
}

// ============================================
// QUERY KEYS
// ============================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  upcoming: () => [...dashboardKeys.all, 'upcoming'] as const,
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetch full dashboard data (stats, activity, upcoming posts)
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: async (): Promise<DashboardData> => {
      const response = await api.get('/dashboard');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch post statistics only
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async (): Promise<PostStats> => {
      const response = await api.get('/dashboard/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch recent activity only
 */
export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: async (): Promise<RecentActivity[]> => {
      const response = await api.get('/dashboard/activity');
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch upcoming posts only
 */
export function useUpcomingPosts() {
  return useQuery({
    queryKey: dashboardKeys.upcoming(),
    queryFn: async (): Promise<UpcomingPost[]> => {
      const response = await api.get('/dashboard/upcoming');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// HELPERS
// ============================================

/** Map of action codes to display text */
const ACTION_DISPLAY_MAP: Record<string, string> = {
  POST_CREATED: 'created a post',
  POST_UPDATED: 'updated a post',
  POST_PUBLISHED: 'published a post',
  POST_SCHEDULED: 'scheduled a post',
  POST_APPROVED: 'approved a post',
  POST_REJECTED: 'rejected a post',
  POST_DELETED: 'deleted a post',
  ARTICLE_CREATED: 'created an article',
  ARTICLE_UPDATED: 'updated an article',
  ARTICLE_PUBLISHED: 'published an article',
  ARTICLE_DELETED: 'deleted an article',
  COMMENT_ADDED: 'added a comment',
  STATUS_CHANGED: 'changed status',
};

/** Map of platform codes to display names */
const PLATFORM_DISPLAY_MAP: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
};

/** Map of platform codes to brand colors */
const PLATFORM_COLOR_MAP: Record<string, string> = {
  INSTAGRAM: '#E4405F',
  LINKEDIN: '#0A66C2',
};

/**
 * Get action display text for activity items
 */
export function getActionDisplayText(action: string): string {
  return ACTION_DISPLAY_MAP[action] || action.toLowerCase().replace(/_/g, ' ');
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: string): string {
  return PLATFORM_DISPLAY_MAP[platform] || platform;
}

/**
 * Get platform color
 */
export function getPlatformColor(platform: string): string {
  return PLATFORM_COLOR_MAP[platform] || '#6B7280';
}
