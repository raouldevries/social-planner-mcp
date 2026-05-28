/**
 * Social Planner - Notification Service
 *
 * Handles user notifications for workflow events.
 * Manages notification creation, retrieval, and marking as read.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { NotificationType, Prisma } from '@social-planner/database';
import type { PaginatedResponse } from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

interface NotificationTemplate {
  title: string;
  body: string;
}

function getNotificationTemplate(
  type: NotificationType,
  data: Record<string, unknown>
): NotificationTemplate {
  switch (type) {
    case 'POST_SUBMITTED':
      return {
        title: 'Post Submitted for Approval',
        body: `${data.authorName || 'A user'} submitted a post for your review.`,
      };

    case 'POST_APPROVED':
      return {
        title: 'Post Approved',
        body: `Your post has been approved${data.approverName ? ` by ${data.approverName}` : ''}.`,
      };

    case 'POST_REJECTED':
      return {
        title: 'Post Rejected',
        body: `Your post was rejected${data.reason ? `: ${data.reason}` : '.'}`,
      };

    case 'POST_PUBLISHED':
      return {
        title: 'Post Published',
        body: `Your post has been published to ${data.platform || 'social media'}.`,
      };

    case 'POST_FAILED':
      return {
        title: 'Post Publishing Failed',
        body: `Failed to publish your post${data.error ? `: ${data.error}` : '.'}`,
      };

    case 'COMMENT_ADDED':
      return {
        title: 'New Comment',
        body: `${data.commenterName || 'Someone'} commented on your post.`,
      };

    case 'MENTION':
      return {
        title: 'You Were Mentioned',
        body: `${data.mentionerName || 'Someone'} mentioned you in a comment.`,
      };

    case 'COLLABORATOR_ASSIGNED':
      return {
        title: 'Added as Collaborator',
        body: `${data.addedByName || 'Someone'} added you as a collaborator on a post.`,
      };

    case 'EDIT_REQUESTED':
      return {
        title: 'Edit Requested',
        body: `${data.requesterName || 'Someone'} requested edits on your post.`,
      };

    case 'REVIEW_REQUESTED':
      return {
        title: 'Review Requested',
        body: `${data.requesterName || 'Someone'} requested your review on a post.`,
      };

    case 'AMBASSADOR_CONTENT':
      return {
        title: 'New Ambassador Content',
        body: `New content is available for you to share.`,
      };

    case 'FEEDBACK_SUBMITTED':
      return {
        title: 'New Feedback Submitted',
        body: `${data.userName || 'A user'} submitted feedback on ${data.pageUrl || 'a page'}.`,
      };

    case 'FEEDBACK_REPLY':
      return {
        title: 'New Reply on Your Feedback',
        body: `${data.replyAuthorName || 'Someone'} replied to your feedback.`,
      };

    default:
      return {
        title: 'Notification',
        body: 'You have a new notification.',
      };
  }
}

// ============================================
// CREATION
// ============================================

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown> = {}
): Promise<NotificationSummary> {
  const template = getNotificationTemplate(type, data);

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title: template.title,
      body: template.body,
      data: data as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data as Record<string, unknown>,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  type: NotificationType,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (userIds.length === 0) return;

  const template = getNotificationTemplate(type, data);

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title: template.title,
      body: template.body,
      data: data as Prisma.InputJsonValue,
    })),
  });
}

/**
 * Notify all admins about a workflow event
 */
export async function notifyAdmins(
  type: NotificationType,
  data: Record<string, unknown> = {}
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const adminIds = admins.map((a) => a.id);
  await createNotificationsForUsers(adminIds, type, data);
}

// ============================================
// RETRIEVAL
// ============================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  filters: NotificationFilters,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<NotificationSummary>> {
  const where: Prisma.NotificationWhereInput = { userId };

  if (filters.unreadOnly) {
    where.readAt = null;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.notification.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data as Record<string, unknown>,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
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
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

// ============================================
// MARK AS READ
// ============================================

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationSummary> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!notification) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('FORBIDDEN', "Cannot mark another user's notification as read", 403);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    body: updated.body,
    data: updated.data as Record<string, unknown>,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return result.count;
}

// ============================================
// DELETION
// ============================================

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!notification) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('FORBIDDEN', "Cannot delete another user's notification", 403);
  }

  await prisma.notification.delete({ where: { id: notificationId } });
}

/**
 * Delete all read notifications for a user
 */
export async function deleteReadNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      readAt: { not: null },
    },
  });

  return result.count;
}

// ============================================
// WORKFLOW HELPERS
// ============================================

/**
 * Notify about post submission (notify admins)
 */
export async function notifyPostSubmitted(
  postId: string,
  authorId: string,
  authorName: string
): Promise<void> {
  await notifyAdmins('POST_SUBMITTED', {
    postId,
    authorId,
    authorName,
  });
}

/**
 * Notify about post approval (notify author)
 */
export async function notifyPostApproved(
  postId: string,
  authorId: string,
  approverId: string,
  approverName: string
): Promise<void> {
  await createNotification(authorId, 'POST_APPROVED', {
    postId,
    approverId,
    approverName,
  });
}

/**
 * Notify about post rejection (notify author)
 */
export async function notifyPostRejected(
  postId: string,
  authorId: string,
  reason: string
): Promise<void> {
  await createNotification(authorId, 'POST_REJECTED', {
    postId,
    reason,
  });
}

/**
 * Notify about post published (notify author)
 */
export async function notifyPostPublished(
  postId: string,
  authorId: string,
  platform: string
): Promise<void> {
  await createNotification(authorId, 'POST_PUBLISHED', {
    postId,
    platform,
  });
}

/**
 * Notify about post publishing failure (notify author)
 */
export async function notifyPostFailed(
  postId: string,
  authorId: string,
  error: string
): Promise<void> {
  await createNotification(authorId, 'POST_FAILED', {
    postId,
    error,
  });
}

/**
 * Notify about being added as collaborator
 */
export async function notifyCollaboratorAdded(
  postId: string,
  collaboratorId: string,
  addedByName: string
): Promise<void> {
  await createNotification(collaboratorId, 'COLLABORATOR_ASSIGNED', {
    postId,
    addedByName,
  });
}

/**
 * Notify about new comment on post (notify author and collaborators)
 */
export async function notifyCommentAdded(
  postId: string,
  commenterId: string,
  commenterName: string,
  excludeUserId?: string
): Promise<void> {
  // Get post author and collaborators
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true,
      collaborators: {
        select: { userId: true },
      },
    },
  });

  if (!post) return;

  const userIds = new Set<string>();
  userIds.add(post.authorId);
  post.collaborators.forEach((c) => userIds.add(c.userId));

  // Remove commenter and excluded user
  userIds.delete(commenterId);
  if (excludeUserId) userIds.delete(excludeUserId);

  await createNotificationsForUsers(Array.from(userIds), 'COMMENT_ADDED', {
    postId,
    commenterId,
    commenterName,
  });
}

/**
 * Notify mentioned users in a comment
 */
export async function notifyMentions(
  postId: string,
  mentionedUserIds: string[],
  mentionerId: string,
  mentionerName: string
): Promise<void> {
  // Remove mentioner from list
  const userIds = mentionedUserIds.filter((id) => id !== mentionerId);

  await createNotificationsForUsers(userIds, 'MENTION', {
    postId,
    mentionerId,
    mentionerName,
  });
}
