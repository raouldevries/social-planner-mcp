/**
 * Social Planner - Comment Service
 *
 * Handles threaded comments on posts with mention notifications.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import * as notificationService from './notification.service';

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
  author: CommentAuthor;
  parentId: string | null;
  content: string;
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

// ============================================
// HELPERS
// ============================================

function formatCommentAuthor(comment: {
  authorId: string | null;
  author: { id: string; fullName: string; avatarUrl: string | null } | null;
  externalAuthorName: string | null;
}): CommentAuthor {
  if (comment.author) {
    return {
      id: comment.author.id,
      fullName: comment.author.fullName,
      avatarUrl: comment.author.avatarUrl,
      isExternal: false,
    };
  }

  return {
    id: null,
    fullName: comment.externalAuthorName || 'Anonymous',
    avatarUrl: null,
    isExternal: true,
  };
}

function formatComment(comment: {
  id: string;
  postId: string;
  authorId: string | null;
  author: { id: string; fullName: string; avatarUrl: string | null } | null;
  externalAuthorName: string | null;
  parentId: string | null;
  content: string;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { replies: number };
  mentions: Array<{ userId: string; comment?: { author?: { id: string; fullName: string } | null } }>;
}): CommentSummary {
  return {
    id: comment.id,
    postId: comment.postId,
    author: formatCommentAuthor(comment),
    parentId: comment.parentId,
    content: comment.content,
    isResolved: comment.isResolved,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replyCount: comment._count?.replies ?? 0,
    mentions: comment.mentions
      .filter((m) => m.comment?.author)
      .map((m) => ({
        id: m.userId,
        fullName: m.comment?.author?.fullName ?? 'Unknown',
      })),
  };
}

const commentSelect = {
  id: true,
  postId: true,
  authorId: true,
  author: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  },
  externalAuthorName: true,
  parentId: true,
  content: true,
  isResolved: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { replies: true },
  },
  mentions: {
    select: {
      userId: true,
      comment: {
        select: {
          author: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
  },
};

/**
 * Parse @mentions from comment content
 * Returns array of user IDs mentioned
 */
async function parseMentions(content: string): Promise<string[]> {
  // Match @[Name](userId) pattern
  const mentionPattern = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/gi;
  const matches = content.matchAll(mentionPattern);
  const userIds: string[] = [];

  for (const match of matches) {
    const userId = match[2];
    if (userId) {
      userIds.push(userId);
    }
  }

  // Verify users exist
  if (userIds.length > 0) {
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    return existingUsers.map((u) => u.id);
  }

  return [];
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateCommentData {
  content: string;
  parentId?: string;
}

/**
 * Create a comment on a post (internal user)
 */
export async function createComment(
  postId: string,
  userId: string,
  data: CreateCommentData
): Promise<CommentSummary> {
  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Verify parent comment exists and belongs to same post
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: data.parentId },
      select: { postId: true },
    });

    if (!parent) {
      throw new AppError('PARENT_NOT_FOUND', 'Parent comment not found', 404);
    }

    if (parent.postId !== postId) {
      throw new AppError('INVALID_PARENT', 'Parent comment belongs to different post', 400);
    }
  }

  // Parse mentions
  const mentionedUserIds = await parseMentions(data.content);

  // Create comment with mentions
  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: userId,
      parentId: data.parentId ?? null,
      content: data.content,
      mentions: {
        create: mentionedUserIds.map((mentionUserId) => ({
          userId: mentionUserId,
        })),
      },
    },
    select: commentSelect,
  });

  // Get commenter name for notifications
  const commenter = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const commenterName = commenter?.fullName || 'Someone';

  // Notify mentioned users
  if (mentionedUserIds.length > 0) {
    await notificationService.notifyMentions(postId, mentionedUserIds, userId, commenterName);
  }

  // Notify post author and collaborators (excluding mentioner and mentioned users)
  await notificationService.notifyCommentAdded(postId, userId, commenterName);

  return formatComment(comment);
}

/**
 * Create a comment from external reviewer (via share link)
 */
export async function createExternalComment(
  postId: string,
  authorName: string,
  authorEmail: string,
  data: CreateCommentData
): Promise<CommentSummary> {
  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Verify parent comment exists and belongs to same post
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: data.parentId },
      select: { postId: true },
    });

    if (!parent) {
      throw new AppError('PARENT_NOT_FOUND', 'Parent comment not found', 404);
    }

    if (parent.postId !== postId) {
      throw new AppError('INVALID_PARENT', 'Parent comment belongs to different post', 400);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      externalAuthorName: authorName,
      externalAuthorEmail: authorEmail,
      parentId: data.parentId ?? null,
      content: data.content,
    },
    select: commentSelect,
  });

  // Notify post author about external comment
  if (post.authorId) {
    await notificationService.notifyCommentAdded(
      postId,
      '', // No internal commenter ID for external comments
      `${authorName} (external)`
    );
  }

  return formatComment(comment);
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get comments for a post (threaded)
 */
export async function getPostComments(postId: string): Promise<CommentListResult> {
  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Get top-level comments with their replies
  const topLevelComments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
    },
    select: {
      ...commentSelect,
      replies: {
        select: commentSelect,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const items: CommentThread[] = topLevelComments.map((comment) => ({
    ...formatComment(comment),
    replies: comment.replies.map(formatComment),
  }));

  return {
    items,
    total: topLevelComments.length,
  };
}

/**
 * Get a single comment by ID
 */
export async function getCommentById(commentId: string): Promise<CommentSummary> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: commentSelect,
  });

  if (!comment) {
    throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
  }

  return formatComment(comment);
}

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<CommentSummary> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, createdAt: true },
  });

  if (!comment) {
    throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
  }

  if (comment.authorId !== userId) {
    throw new AppError('FORBIDDEN', 'You can only edit your own comments', 403);
  }

  // Check if comment is within 24 hours edit window
  const hoursSinceCreation = (Date.now() - comment.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    throw new AppError('EDIT_WINDOW_EXPIRED', 'Comments can only be edited within 24 hours', 400);
  }

  // Parse new mentions
  const mentionedUserIds = await parseMentions(content);

  // Update comment and replace mentions
  await prisma.commentMention.deleteMany({ where: { commentId } });

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      mentions: {
        create: mentionedUserIds.map((mentionUserId) => ({
          userId: mentionUserId,
        })),
      },
    },
    select: commentSelect,
  });

  return formatComment(updated);
}

/**
 * Resolve/unresolve a comment
 */
export async function toggleResolveComment(
  commentId: string,
  userId: string
): Promise<CommentSummary> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      isResolved: true,
      post: { select: { authorId: true } },
    },
  });

  if (!comment) {
    throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
  }

  // Only post author can resolve comments
  if (comment.post.authorId !== userId) {
    throw new AppError('FORBIDDEN', 'Only post author can resolve comments', 403);
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { isResolved: !comment.isResolved },
    select: commentSelect,
  });

  return formatComment(updated);
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      createdAt: true,
      post: { select: { authorId: true } },
    },
  });

  if (!comment) {
    throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
  }

  const isAuthor = comment.authorId === userId;
  const isPostAuthor = comment.post.authorId === userId;

  // Check if within 24 hour window for comment author
  const hoursSinceCreation = (Date.now() - comment.createdAt.getTime()) / (1000 * 60 * 60);
  const withinEditWindow = hoursSinceCreation <= 24;

  // Allow delete if: author within 24 hours, or post author
  if (!isPostAuthor && (!isAuthor || !withinEditWindow)) {
    throw new AppError(
      'FORBIDDEN',
      'You can only delete your own comments within 24 hours, or be the post author',
      403
    );
  }

  await prisma.comment.delete({ where: { id: commentId } });
}

// ============================================
// UTILITY OPERATIONS
// ============================================

/**
 * Get comment count for a post
 */
export async function getCommentCount(postId: string): Promise<number> {
  return prisma.comment.count({ where: { postId } });
}

/**
 * Get unresolved comment count for a post
 */
export async function getUnresolvedCount(postId: string): Promise<number> {
  return prisma.comment.count({
    where: { postId, isResolved: false },
  });
}
