/**
 * Social Planner - Activity Service
 *
 * Handles activity logging for posts and articles.
 * Tracks workflow changes, edits, and other significant actions.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@social-planner/database';
import type { PaginatedResponse, UserSummary } from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

export interface ActivityLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  actor: UserSummary;
  createdAt: string;
}

export interface ActivityLogFilters {
  postId?: string;
  articleId?: string;
  actorId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================
// ACTIVITY ACTIONS
// ============================================

export const ACTIVITY_ACTIONS = {
  // Post actions
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  POST_SUBMITTED: 'post.submitted',
  POST_APPROVED: 'post.approved',
  POST_REJECTED: 'post.rejected',
  POST_SCHEDULED: 'post.scheduled',
  POST_UNSCHEDULED: 'post.unscheduled',
  POST_PUBLISHED: 'post.published',
  POST_UNPUBLISHED: 'post.unpublished',

  // Channel actions
  CHANNEL_ADDED: 'channel.added',
  CHANNEL_UPDATED: 'channel.updated',
  CHANNEL_REMOVED: 'channel.removed',
  CHANNEL_PUBLISHED: 'channel.published',
  CHANNEL_FAILED: 'channel.failed',

  // Collaborator actions
  COLLABORATOR_ADDED: 'collaborator.added',
  COLLABORATOR_REMOVED: 'collaborator.removed',

  // Article actions
  ARTICLE_CREATED: 'article.created',
  ARTICLE_UPDATED: 'article.updated',
  ARTICLE_DELETED: 'article.deleted',
  ARTICLE_PUBLISHED: 'article.published',
  ARTICLE_UNPUBLISHED: 'article.unpublished',

  // Comment actions
  COMMENT_ADDED: 'comment.added',
  COMMENT_UPDATED: 'comment.updated',
  COMMENT_DELETED: 'comment.deleted',
} as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

// ============================================
// HELPERS
// ============================================

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  timezone: true,
  role: true,
};

function formatUserSummary(user: any): UserSummary {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    role: user.role,
  };
}

function formatActivityLogEntry(entry: any): ActivityLogEntry {
  return {
    id: entry.id,
    action: entry.action,
    details: entry.details as Record<string, unknown>,
    actor: formatUserSummary(entry.actor),
    createdAt: entry.createdAt.toISOString(),
  };
}

// ============================================
// LOGGING
// ============================================

/**
 * Log an activity for a post
 */
export async function logPostActivity(
  postId: string,
  actorId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      postId,
      actorId,
      action,
      details: details as Prisma.InputJsonValue,
    },
  });
}

/**
 * Log an activity for an article
 */
export async function logArticleActivity(
  articleId: string,
  actorId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      articleId,
      actorId,
      action,
      details: details as Prisma.InputJsonValue,
    },
  });
}

// ============================================
// RETRIEVAL
// ============================================

/**
 * Get activity log for a post
 */
export async function getPostActivityLog(
  postId: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<ActivityLogEntry>> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  const where: Prisma.ActivityLogWhereInput = { postId };

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        actor: {
          select: userSummarySelect,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: entries.map(formatActivityLogEntry),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get activity log for an article
 */
export async function getArticleActivityLog(
  articleId: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<ActivityLogEntry>> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  const where: Prisma.ActivityLogWhereInput = { articleId };

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        actor: {
          select: userSummarySelect,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: entries.map(formatActivityLogEntry),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get global activity log with filters
 */
export async function getActivityLog(
  filters: ActivityLogFilters,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<ActivityLogEntry & { postId?: string; articleId?: string }>> {
  const where: Prisma.ActivityLogWhereInput = {};

  if (filters.postId) {
    where.postId = filters.postId;
  }

  if (filters.articleId) {
    where.articleId = filters.articleId;
  }

  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.action) {
    where.action = { contains: filters.action };
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      where.createdAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.createdAt.lte = new Date(filters.toDate);
    }
  }

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        postId: true,
        articleId: true,
        action: true,
        details: true,
        createdAt: true,
        actor: {
          select: userSummarySelect,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: entries.map((entry) => {
      const result: ActivityLogEntry & { postId?: string; articleId?: string } = {
        ...formatActivityLogEntry(entry),
      };
      if (entry.postId) result.postId = entry.postId;
      if (entry.articleId) result.articleId = entry.articleId;
      return result;
    }),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get recent activity for a user (their actions)
 */
export async function getUserActivity(
  userId: string,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<ActivityLogEntry & { postId?: string; articleId?: string }>> {
  const where: Prisma.ActivityLogWhereInput = { actorId: userId };

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        postId: true,
        articleId: true,
        action: true,
        details: true,
        createdAt: true,
        actor: {
          select: userSummarySelect,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: entries.map((entry) => {
      const result: ActivityLogEntry & { postId?: string; articleId?: string } = {
        ...formatActivityLogEntry(entry),
      };
      if (entry.postId) result.postId = entry.postId;
      if (entry.articleId) result.articleId = entry.articleId;
      return result;
    }),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
