/**
 * Social Planner - Share Link Service
 *
 * Handles shareable links for external review of posts and calendars.
 */

import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { resolveMediaUrls } from '../lib/media-utils';
import { AppError } from '../middleware/errorHandler';
import { SharePermission, PostStatus } from '@social-planner/database';
import { sendReviewRequestEmail } from './email.service';

// ============================================
// TYPES
// ============================================

export interface ShareLinkSummary {
  id: string;
  token: string;
  postId: string | null;
  calendarShare: boolean;
  month: string | null;
  hasPassword: boolean;
  permissions: SharePermission;
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
  permissions: SharePermission;
}

export interface ShareLinkAccessResult {
  type: 'post' | 'calendar';
  permissions: SharePermission;
  requiresPassword: boolean;
  post?: SharedPostData;
  calendar?: SharedCalendarData;
}

// ============================================
// HELPERS
// ============================================

function getBaseUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function formatSharedPost(post: {
  id: string;
  baseContent: string | null;
  status: PostStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  author: { id: string; fullName: string; avatarUrl: string | null };
  media: Array<{
    mediaAsset: {
      id: string;
      storagePath: string;
      thumbnailPath: string | null;
      fileType: string;
      altText: string | null;
    };
  }>;
  channels: Array<{
    socialAccount: { platform: string; accountName: string };
    scheduledAt: Date | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; fullName: string; avatarUrl: string | null } | null;
    externalAuthorName: string | null;
  }>;
  _count: { comments: number };
}): SharedPostData {
  return {
    id: post.id,
    baseContent: post.baseContent || '',
    status: post.status,
    scheduledAt: post.scheduledAt?.toISOString() || null,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      fullName: post.author.fullName,
      avatarUrl: post.author.avatarUrl,
    },
    media: post.media.map((m) => ({
      id: m.mediaAsset.id,
      ...resolveMediaUrls(m.mediaAsset),
      fileType: m.mediaAsset.fileType,
      altText: m.mediaAsset.altText,
    })),
    channels: post.channels.map((c) => ({
      platform: c.socialAccount.platform,
      accountName: c.socialAccount.accountName,
      scheduledAt: c.scheduledAt?.toISOString() || null,
    })),
    commentCount: post._count.comments,
    comments: post.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: c.author
        ? {
            id: c.author.id,
            fullName: c.author.fullName,
            avatarUrl: c.author.avatarUrl,
          }
        : {
            id: null,
            fullName: c.externalAuthorName || 'Anonymous',
            avatarUrl: null,
          },
      isExternal: !c.author,
    })),
  };
}

// ============================================
// CREATE SHARE LINK
// ============================================

export interface CreateShareLinkInput {
  postId?: string;
  calendarShare?: boolean;
  month?: string; // Format: YYYY-MM for calendar shares
  expiresInHours: number;
  permissions: SharePermission;
  password?: string;
}

/**
 * Create a share link for a post or calendar month
 */
export async function createShareLink(
  userId: string,
  data: CreateShareLinkInput
): Promise<ShareLinkSummary> {
  // Validate input
  if (!data.postId && !data.calendarShare) {
    throw new AppError('INVALID_INPUT', 'Must specify either postId or calendarShare', 400);
  }

  if (data.calendarShare && !data.month) {
    throw new AppError('INVALID_INPUT', 'Month is required for calendar shares', 400);
  }

  // Verify post exists if sharing a post
  if (data.postId) {
    const post = await prisma.post.findUnique({
      where: { id: data.postId },
      select: { id: true },
    });

    if (!post) {
      throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
    }
  }

  // Generate token and hash password if provided
  const token = randomUUID();
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + data.expiresInHours);

  // Create share link
  const shareLink = await prisma.shareLink.create({
    data: {
      token,
      postId: data.postId || null,
      calendarShare: data.calendarShare || false,
      passwordHash,
      expiresAt,
      permissions: data.permissions,
      createdById: userId,
    },
  });

  return {
    id: shareLink.id,
    token: shareLink.token,
    postId: shareLink.postId,
    calendarShare: shareLink.calendarShare,
    month: data.month || null,
    hasPassword: !!shareLink.passwordHash,
    permissions: shareLink.permissions,
    expiresAt: shareLink.expiresAt.toISOString(),
    createdAt: shareLink.createdAt.toISOString(),
    url: `${getBaseUrl()}/shared/${shareLink.token}${data.month ? `?month=${data.month}` : ''}`,
  };
}

// ============================================
// ACCESS SHARE LINK
// ============================================

/**
 * Get share link metadata (without content, for checking password requirement)
 */
export async function getShareLinkMeta(token: string): Promise<{
  requiresPassword: boolean;
  type: 'post' | 'calendar';
  expired: boolean;
}> {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      passwordHash: true,
      calendarShare: true,
      expiresAt: true,
    },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  return {
    requiresPassword: !!shareLink.passwordHash,
    type: shareLink.calendarShare ? 'calendar' : 'post',
    expired: shareLink.expiresAt < new Date(),
  };
}

/**
 * Verify password for a share link
 */
export async function verifyShareLinkPassword(token: string, password: string): Promise<boolean> {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    select: { passwordHash: true },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  if (!shareLink.passwordHash) {
    return true; // No password required
  }

  return bcrypt.compare(password, shareLink.passwordHash);
}

/**
 * Access shared content (post or calendar)
 */
export async function accessShareLink(
  token: string,
  month?: string
): Promise<ShareLinkAccessResult> {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      post: {
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          media: {
            include: {
              mediaAsset: {
                select: {
                  id: true,
                  storagePath: true,
                  thumbnailPath: true,
                  fileType: true,
                  altText: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          channels: {
            include: {
              socialAccount: {
                select: { platform: true, accountName: true },
              },
            },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              externalAuthorName: true,
              author: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      },
    },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  // Check expiration
  if (shareLink.expiresAt < new Date()) {
    throw new AppError('SHARE_LINK_EXPIRED', 'This share link has expired', 410);
  }

  // If password protected, require verification first
  if (shareLink.passwordHash) {
    return {
      type: shareLink.calendarShare ? 'calendar' : 'post',
      permissions: shareLink.permissions,
      requiresPassword: true,
    };
  }

  // Return post data
  if (!shareLink.calendarShare && shareLink.post) {
    return {
      type: 'post',
      permissions: shareLink.permissions,
      requiresPassword: false,
      post: formatSharedPost(shareLink.post),
    };
  }

  // Return calendar data
  if (shareLink.calendarShare) {
    if (!month) {
      // Default to current month
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Parse month safely
    const parts = month.split('-');
    const year = parseInt(parts[0] || '', 10);
    const monthNum = parseInt(parts[1] || '', 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new AppError('INVALID_MONTH', 'Invalid month format', 400);
    }

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    // Fetch posts for the month
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: startDate, lte: endDate } },
          {
            channels: {
              some: { scheduledAt: { gte: startDate, lte: endDate } },
            },
          },
        ],
        status: {
          in: [
            PostStatus.DRAFT,
            PostStatus.PENDING_APPROVAL,
            PostStatus.APPROVED,
            PostStatus.SCHEDULED,
          ],
        },
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        media: {
          include: {
            mediaAsset: {
              select: {
                id: true,
                storagePath: true,
                thumbnailPath: true,
                fileType: true,
                altText: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        channels: {
          include: {
            socialAccount: {
              select: { platform: true, accountName: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            externalAuthorName: true,
            author: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      type: 'calendar',
      permissions: shareLink.permissions,
      requiresPassword: false,
      calendar: {
        month,
        posts: posts.map(formatSharedPost),
        permissions: shareLink.permissions,
      },
    };
  }

  throw new AppError('INVALID_SHARE_LINK', 'Invalid share link configuration', 500);
}

/**
 * Access shared content after password verification
 */
export async function accessShareLinkWithPassword(
  token: string,
  password: string,
  month?: string
): Promise<ShareLinkAccessResult> {
  const isValid = await verifyShareLinkPassword(token, password);

  if (!isValid) {
    throw new AppError('INVALID_PASSWORD', 'Invalid password', 401);
  }

  // Get share link and return content
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      post: {
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          media: {
            include: {
              mediaAsset: {
                select: {
                  id: true,
                  storagePath: true,
                  thumbnailPath: true,
                  fileType: true,
                  altText: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          channels: {
            include: {
              socialAccount: {
                select: { platform: true, accountName: true },
              },
            },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              externalAuthorName: true,
              author: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      },
    },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  if (shareLink.expiresAt < new Date()) {
    throw new AppError('SHARE_LINK_EXPIRED', 'This share link has expired', 410);
  }

  // Return post data
  if (!shareLink.calendarShare && shareLink.post) {
    return {
      type: 'post',
      permissions: shareLink.permissions,
      requiresPassword: false,
      post: formatSharedPost(shareLink.post),
    };
  }

  // Return calendar data
  if (shareLink.calendarShare) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Parse month safely
    const parts = month.split('-');
    const year = parseInt(parts[0] || '', 10);
    const monthNum = parseInt(parts[1] || '', 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new AppError('INVALID_MONTH', 'Invalid month format', 400);
    }

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: startDate, lte: endDate } },
          {
            channels: {
              some: { scheduledAt: { gte: startDate, lte: endDate } },
            },
          },
        ],
        status: {
          in: [
            PostStatus.DRAFT,
            PostStatus.PENDING_APPROVAL,
            PostStatus.APPROVED,
            PostStatus.SCHEDULED,
          ],
        },
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        media: {
          include: {
            mediaAsset: {
              select: {
                id: true,
                storagePath: true,
                thumbnailPath: true,
                fileType: true,
                altText: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        channels: {
          include: {
            socialAccount: {
              select: { platform: true, accountName: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            externalAuthorName: true,
            author: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      type: 'calendar',
      permissions: shareLink.permissions,
      requiresPassword: false,
      calendar: {
        month,
        posts: posts.map(formatSharedPost),
        permissions: shareLink.permissions,
      },
    };
  }

  throw new AppError('INVALID_SHARE_LINK', 'Invalid share link configuration', 500);
}

// ============================================
// LIST SHARE LINKS
// ============================================

/**
 * List share links created by a user
 */
export async function listUserShareLinks(userId: string): Promise<ShareLinkSummary[]> {
  const shareLinks = await prisma.shareLink.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
  });

  return shareLinks.map((link) => ({
    id: link.id,
    token: link.token,
    postId: link.postId,
    calendarShare: link.calendarShare,
    month: null,
    hasPassword: !!link.passwordHash,
    permissions: link.permissions,
    expiresAt: link.expiresAt.toISOString(),
    createdAt: link.createdAt.toISOString(),
    url: `${getBaseUrl()}/shared/${link.token}`,
  }));
}

/**
 * List share links for a specific post
 */
export async function listPostShareLinks(postId: string): Promise<ShareLinkSummary[]> {
  const shareLinks = await prisma.shareLink.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
  });

  return shareLinks.map((link) => ({
    id: link.id,
    token: link.token,
    postId: link.postId,
    calendarShare: link.calendarShare,
    month: null,
    hasPassword: !!link.passwordHash,
    permissions: link.permissions,
    expiresAt: link.expiresAt.toISOString(),
    createdAt: link.createdAt.toISOString(),
    url: `${getBaseUrl()}/shared/${link.token}`,
  }));
}

// ============================================
// DELETE SHARE LINK
// ============================================

/**
 * Delete a share link (owner or admin)
 */
export async function deleteShareLink(
  linkId: string,
  userId: string,
  isAdmin = false
): Promise<void> {
  const shareLink = await prisma.shareLink.findUnique({
    where: { id: linkId },
    select: { createdById: true },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  // Allow deletion if user is admin or the creator
  if (!isAdmin && shareLink.createdById !== userId) {
    throw new AppError('FORBIDDEN', 'You can only delete your own share links', 403);
  }

  await prisma.shareLink.delete({ where: { id: linkId } });
}

// ============================================
// EXTERNAL COMMENTS
// ============================================

/**
 * Add an external comment via share link
 */
export async function addExternalComment(
  token: string,
  postId: string,
  data: { name: string; email: string; content: string; parentId?: string }
): Promise<{ id: string }> {
  // Verify share link
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      permissions: true,
      expiresAt: true,
      calendarShare: true,
      postId: true,
    },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  if (shareLink.expiresAt < new Date()) {
    throw new AppError('SHARE_LINK_EXPIRED', 'This share link has expired', 410);
  }

  if (shareLink.permissions !== SharePermission.VIEW_COMMENT) {
    throw new AppError('FORBIDDEN', 'This share link does not allow comments', 403);
  }

  // For post share links, verify the post ID matches
  if (!shareLink.calendarShare && shareLink.postId !== postId) {
    throw new AppError('FORBIDDEN', 'Cannot comment on this post', 403);
  }

  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Create external comment
  const comment = await prisma.comment.create({
    data: {
      postId,
      parentId: data.parentId || null,
      content: data.content,
      externalAuthorName: data.name,
      externalAuthorEmail: data.email,
    },
    select: { id: true },
  });

  return { id: comment.id };
}

// ============================================
// EXTERNAL APPROVAL
// ============================================

/**
 * Approve a post via share link (external reviewer)
 */
export async function approvePostViaShareLink(
  token: string,
  postId: string,
  data: { name: string; email: string }
): Promise<{ success: boolean; postId: string }> {
  // Verify share link
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      permissions: true,
      expiresAt: true,
      calendarShare: true,
      postId: true,
    },
  });

  if (!shareLink) {
    throw new AppError('SHARE_LINK_NOT_FOUND', 'Share link not found', 404);
  }

  if (shareLink.expiresAt < new Date()) {
    throw new AppError('SHARE_LINK_EXPIRED', 'This share link has expired', 410);
  }

  // Only VIEW_COMMENT permission allows approval
  if (shareLink.permissions !== SharePermission.VIEW_COMMENT) {
    throw new AppError('FORBIDDEN', 'This share link does not allow approval', 403);
  }

  // For post share links, verify the post ID matches
  if (!shareLink.calendarShare && shareLink.postId !== postId) {
    throw new AppError('FORBIDDEN', 'Cannot approve this post', 403);
  }

  // Verify post exists and is in a status that can be approved
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Only posts in PENDING_APPROVAL or DRAFT status can be approved by external reviewers
  if (post.status !== PostStatus.PENDING_APPROVAL && post.status !== PostStatus.DRAFT) {
    throw new AppError('INVALID_STATUS', 'This post cannot be approved in its current status', 400);
  }

  // Update post status to APPROVED
  await prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.APPROVED },
  });

  // Add an activity log entry for the external approval
  await prisma.activityLog.create({
    data: {
      postId,
      actorId: post.authorId,
      action: 'APPROVED',
      details: {
        approvedBy: 'external',
        externalName: data.name,
        externalEmail: data.email,
      },
    },
  });

  return { success: true, postId };
}

// ============================================
// SEND REVIEW REQUEST
// ============================================

export interface SendReviewRequestInput {
  postId: string;
  recipientEmail: string;
  message?: string;
}

/**
 * Create a share link and send a review request email
 */
export async function sendReviewRequest(
  userId: string,
  data: SendReviewRequestInput
): Promise<ShareLinkSummary> {
  // Get the user sending the request
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  if (!sender) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Get the post content for preview
  const post = await prisma.post.findUnique({
    where: { id: data.postId },
    select: { baseContent: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Create a share link
  const shareLink = await createShareLink(userId, {
    postId: data.postId,
    expiresInHours: 720, // 30 days
    permissions: SharePermission.VIEW_COMMENT,
  });

  // Send the email
  const emailSent = await sendReviewRequestEmail({
    recipientEmail: data.recipientEmail,
    senderName: sender.fullName,
    postPreview: post.baseContent || '',
    reviewUrl: shareLink.url,
    ...(data.message && { message: data.message }),
  });

  if (!emailSent) {
    // Log but don't fail - the share link was still created
    // The user can still copy the link manually
  }

  return shareLink;
}
