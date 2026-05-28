/**
 * Social Planner - Dashboard Service
 *
 * Aggregates statistics and data for the dashboard view.
 */

import { prisma } from '../lib/prisma';
import { PostStatus, Prisma } from '@social-planner/database';

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
  details: Prisma.JsonValue;
  createdAt: Date;
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
  scheduledAt: Date;
  status: PostStatus;
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
// SERVICE FUNCTIONS
// ============================================

/**
 * Get post statistics by status
 */
export async function getPostStats(): Promise<PostStats> {
  const statusCounts = await prisma.post.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  const stats: PostStats = {
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    scheduled: 0,
    published: 0,
    rejected: 0,
    unpublished: 0,
    total: 0,
  };

  for (const { status, _count } of statusCounts) {
    const count = _count.id;
    stats.total += count;

    switch (status) {
      case 'DRAFT':
        stats.draft = count;
        break;
      case 'PENDING_APPROVAL':
        stats.pendingApproval = count;
        break;
      case 'APPROVED':
        stats.approved = count;
        break;
      case 'SCHEDULED':
        stats.scheduled = count;
        break;
      case 'PUBLISHED':
        stats.published = count;
        break;
      case 'REJECTED':
        stats.rejected = count;
        break;
      case 'UNPUBLISHED':
        stats.unpublished = count;
        break;
    }
  }

  return stats;
}

/**
 * Get recent activity across the workspace
 */
export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
  const activities = await prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      post: {
        select: {
          id: true,
          baseContent: true,
        },
      },
      article: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return activities;
}

/**
 * Get upcoming scheduled posts
 */
export async function getUpcomingPosts(limit = 5): Promise<UpcomingPost[]> {
  const now = new Date();

  const posts = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: now,
      },
    },
    take: limit,
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      baseContent: true,
      scheduledAt: true,
      status: true,
      author: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      channels: {
        select: {
          socialAccount: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  return posts.map((post) => ({
    id: post.id,
    baseContent: post.baseContent,
    scheduledAt: post.scheduledAt!,
    status: post.status,
    author: post.author,
    channels: post.channels.map((c) => ({
      platform: c.socialAccount.platform,
      accountName: c.socialAccount.accountName,
    })),
  }));
}

/**
 * Get count of posts published this week
 */
export async function getPublishedThisWeek(): Promise<number> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const count = await prisma.post.count({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: startOfWeek,
      },
    },
  });

  return count;
}

/**
 * Get full dashboard data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [postStats, recentActivity, upcomingPosts, publishedThisWeek] =
    await Promise.all([
      getPostStats(),
      getRecentActivity(10),
      getUpcomingPosts(5),
      getPublishedThisWeek(),
    ]);

  return {
    postStats,
    recentActivity,
    upcomingPosts,
    publishedThisWeek,
    pendingApprovalCount: postStats.pendingApproval,
  };
}
