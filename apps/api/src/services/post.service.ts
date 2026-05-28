/**
 * Social Planner - Post Service
 *
 * Handles post CRUD operations, status workflow, and scheduling.
 * Single workspace architecture - all posts belong to Acme workspace.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PostStatus, Prisma } from '@social-planner/database';
import type {
  PostSummary,
  PostDetail,
  CreatePostRequest,
  UpdatePostRequest,
  SchedulePostRequest,
  PaginatedResponse,
  UserSummary,
} from '@social-planner/shared';
import * as versionService from './version.service';
import * as notificationService from './notification.service';
import * as activityService from './activity.service';
import { ACTIVITY_ACTIONS } from './activity.service';
import * as emailService from './email.service';
import { config } from '../config';
import { resolveMediaUrl, resolveMediaUrls } from '../lib/media-utils';

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

const postSummarySelect = {
  id: true,
  status: true,
  baseContent: true,
  scheduledAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: userSummarySelect,
  },
  channels: {
    select: {
      id: true,
      socialAccountId: true,
      customContent: true,
      scheduledAt: true,
      status: true,
      publishError: true,
      platformPostId: true,
      publishedAt: true,
      socialAccount: {
        select: {
          platform: true,
          accountName: true,
        },
      },
    },
  },
  media: {
    select: {
      id: true,
      position: true,
      mediaAsset: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          storagePath: true,
          thumbnailPath: true,
        },
      },
    },
    orderBy: { position: 'asc' as const },
    take: 1, // Just for thumbnail
  },
  collaborators: {
    select: {
      userId: true,
      assignedAt: true,
      user: {
        select: userSummarySelect,
      },
      assignedBy: {
        select: userSummarySelect,
      },
    },
  },
  _count: {
    select: {
      media: true,
      collaborators: true,
      comments: true,
    },
  },
};

const postDetailSelect = {
  ...postSummarySelect,
  rejectionReason: true,
  isAmbassadorAvailable: true,
  linkUrl: true,
  linkPreview: true,
  articleId: true,
  article: {
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      plannedAt: true,
      author: {
        select: userSummarySelect,
      },
      featuredImage: {
        select: {
          id: true,
          storagePath: true,
          thumbnailPath: true,
        },
      },
    },
  },
  media: {
    select: {
      id: true,
      position: true,
      altText: true,
      mediaAssetId: true,
      mediaAsset: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          storagePath: true,
          thumbnailPath: true,
          width: true,
          height: true,
        },
      },
    },
    orderBy: { position: 'asc' as const },
  },
  collaborators: {
    select: {
      userId: true,
      assignedAt: true,
      user: {
        select: userSummarySelect,
      },
      assignedBy: {
        select: userSummarySelect,
      },
    },
  },
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

function formatPostSummary(post: any): PostSummary {
  return {
    id: post.id,
    status: post.status,
    baseContent: post.baseContent,
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    author: formatUserSummary(post.author),
    channels: post.channels.map((ch: any) => ({
      id: ch.id,
      socialAccountId: ch.socialAccountId,
      platform: ch.socialAccount.platform,
      accountName: ch.socialAccount.accountName,
      customContent: ch.customContent,
      scheduledAt: ch.scheduledAt?.toISOString() ?? null,
      status: ch.status,
      publishError: ch.publishError,
      platformPostId: ch.platformPostId,
      publishedAt: ch.publishedAt?.toISOString() ?? null,
    })),
    mediaCount: post._count.media,
    thumbnailUrl: resolveMediaUrl(post.media[0]?.mediaAsset?.thumbnailPath),
    collaboratorCount: post._count.collaborators,
    collaborators:
      post.collaborators?.map((c: any) => ({
        userId: c.userId,
        user: formatUserSummary(c.user),
        assignedAt: c.assignedAt?.toISOString() ?? new Date().toISOString(),
        assignedBy: formatUserSummary(c.assignedBy),
      })) ?? [],
    commentCount: post._count.comments,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function formatPostDetail(post: any): PostDetail {
  const summary = formatPostSummary(post);
  return {
    ...summary,
    rejectionReason: post.rejectionReason,
    isAmbassadorAvailable: post.isAmbassadorAvailable,
    article: post.article
      ? {
          id: post.article.id,
          title: post.article.title,
          status: post.article.status,
          author: formatUserSummary(post.article.author),
          featuredImageUrl: resolveMediaUrl(post.article.featuredImage?.storagePath),
          createdAt: post.article.createdAt.toISOString(),
          updatedAt: post.article.updatedAt.toISOString(),
          publishedAt: post.article.publishedAt?.toISOString() ?? null,
          plannedAt: post.article.plannedAt?.toISOString() ?? null,
        }
      : null,
    linkUrl: post.linkUrl,
    linkPreview: post.linkPreview as PostDetail['linkPreview'],
    media: post.media.map((m: any) => ({
      id: m.id,
      mediaAssetId: m.mediaAssetId,
      position: m.position,
      altText: m.altText,
      fileName: m.mediaAsset.fileName,
      fileType: m.mediaAsset.fileType,
      ...resolveMediaUrls(m.mediaAsset),
      width: m.mediaAsset.width,
      height: m.mediaAsset.height,
    })),
    collaborators: post.collaborators.map((c: any) => ({
      userId: c.userId,
      user: formatUserSummary(c.user),
      assignedAt: c.assignedAt.toISOString(),
      assignedBy: formatUserSummary(c.assignedBy),
    })),
  };
}

// ============================================
// POST CRUD
// ============================================

export interface PostFilters {
  status?: string[];
  platform?: 'INSTAGRAM' | 'LINKEDIN';
  authorId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export async function getPosts(
  filters: PostFilters,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<PostSummary>> {
  const where: Prisma.PostWhereInput = {};

  // Status filter
  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status as PostStatus[] };
  }

  // Platform filter - posts with at least one channel on this platform
  if (filters.platform) {
    where.channels = {
      some: {
        socialAccount: {
          platform: filters.platform,
        },
      },
    };
  }

  // Author filter
  if (filters.authorId) {
    where.authorId = filters.authorId;
  }

  // Date range filter
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      where.createdAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.createdAt.lte = new Date(filters.toDate);
    }
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      { baseContent: { contains: filters.search, mode: 'insensitive' } },
      { channels: { some: { customContent: { contains: filters.search, mode: 'insensitive' } } } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: postSummarySelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: posts.map(formatPostSummary),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export async function getPostById(postId: string): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: postDetailSelect,
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  return formatPostDetail(post);
}

export async function createPost(authorId: string, data: CreatePostRequest): Promise<PostDetail> {
  // Validate channels if provided
  if (data.channels && data.channels.length > 0) {
    const socialAccountIds = data.channels.map((c) => c.socialAccountId);
    const accounts = await prisma.socialAccount.findMany({
      where: { id: { in: socialAccountIds } },
    });

    if (accounts.length !== socialAccountIds.length) {
      throw new AppError('INVALID_SOCIAL_ACCOUNT', 'One or more social accounts not found', 400);
    }
  }

  // Validate media if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: data.mediaIds } },
    });

    if (mediaAssets.length !== data.mediaIds.length) {
      throw new AppError('INVALID_MEDIA', 'One or more media assets not found', 400);
    }
  }

  // Validate article if provided
  if (data.articleId) {
    const article = await prisma.article.findUnique({
      where: { id: data.articleId },
    });

    if (!article) {
      throw new AppError('INVALID_ARTICLE', 'Article not found', 400);
    }
  }

  // Build create data
  const createData: Prisma.PostCreateInput = {
    author: { connect: { id: authorId } },
    baseContent: data.baseContent ?? null,
    isAmbassadorAvailable: data.isAmbassadorAvailable ?? false,
    linkUrl: data.linkUrl ?? null,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
  };

  // Connect article if provided
  if (data.articleId) {
    createData.article = { connect: { id: data.articleId } };
  }

  // Create channels if provided
  if (data.channels && data.channels.length > 0) {
    createData.channels = {
      create: data.channels.map((ch) => ({
        socialAccountId: ch.socialAccountId,
        customContent: ch.customContent ?? null,
        scheduledAt: ch.scheduledAt ? new Date(ch.scheduledAt) : null,
      })),
    };
  }

  // Create media relations if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    createData.media = {
      create: data.mediaIds.map((mediaId, index) => ({
        mediaAssetId: mediaId,
        position: index,
      })),
    };
  }

  const post = await prisma.post.create({
    data: createData,
    select: postDetailSelect,
  });

  // Create initial version
  await versionService.createVersion(post.id, post.baseContent, authorId);

  return formatPostDetail(post);
}

export async function updatePost(
  postId: string,
  userId: string,
  data: UpdatePostRequest
): Promise<PostDetail> {
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true, authorId: true, baseContent: true },
  });

  if (!existingPost) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Only allow editing in DRAFT, REJECTED, or APPROVED status
  if (!['DRAFT', 'REJECTED', 'APPROVED'].includes(existingPost.status)) {
    throw new AppError('POST_NOT_EDITABLE', 'Post cannot be edited in its current status', 400);
  }

  // Validate channels if provided
  if (data.channels && data.channels.length > 0) {
    const socialAccountIds = data.channels.map((c) => c.socialAccountId);
    const accounts = await prisma.socialAccount.findMany({
      where: { id: { in: socialAccountIds } },
    });

    if (accounts.length !== socialAccountIds.length) {
      throw new AppError('INVALID_SOCIAL_ACCOUNT', 'One or more social accounts not found', 400);
    }
  }

  // Validate media if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: data.mediaIds } },
    });

    if (mediaAssets.length !== data.mediaIds.length) {
      throw new AppError('INVALID_MEDIA', 'One or more media assets not found', 400);
    }
  }

  // Validate article if provided
  if (data.articleId) {
    const article = await prisma.article.findUnique({
      where: { id: data.articleId },
    });

    if (!article) {
      throw new AppError('INVALID_ARTICLE', 'Article not found', 400);
    }
  }

  // Use transaction to update post, channels, and media
  const post = await prisma.$transaction(async (tx) => {
    // Update channels if provided
    if (data.channels !== undefined) {
      // Delete existing channels
      await tx.postChannel.deleteMany({ where: { postId } });

      // Create new channels
      if (data.channels && data.channels.length > 0) {
        await tx.postChannel.createMany({
          data: data.channels.map((ch) => ({
            postId,
            socialAccountId: ch.socialAccountId,
            customContent: ch.customContent ?? null,
            scheduledAt: ch.scheduledAt ? new Date(ch.scheduledAt) : null,
          })),
        });
      }
    }

    // Update media if provided
    if (data.mediaIds !== undefined) {
      // Delete existing media relations
      await tx.postMedia.deleteMany({ where: { postId } });

      // Create new media relations
      if (data.mediaIds && data.mediaIds.length > 0) {
        await tx.postMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({
            postId,
            mediaAssetId: mediaId,
            position: index,
          })),
        });
      }
    }

    // Build update data
    const updateData: Prisma.PostUpdateInput = {};

    if (data.baseContent !== undefined) {
      updateData.baseContent = data.baseContent ?? null;
    }
    if (data.articleId !== undefined) {
      updateData.article = data.articleId
        ? { connect: { id: data.articleId } }
        : { disconnect: true };
    }
    if (data.isAmbassadorAvailable !== undefined) {
      updateData.isAmbassadorAvailable = data.isAmbassadorAvailable;
    }
    if (data.linkUrl !== undefined) {
      updateData.linkUrl = data.linkUrl ?? null;
    }
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }

    // Reset to DRAFT if was REJECTED
    if (existingPost.status === 'REJECTED') {
      updateData.status = 'DRAFT';
      updateData.rejectionReason = null;
    }

    // Update post
    return tx.post.update({
      where: { id: postId },
      data: updateData,
      select: postDetailSelect,
    });
  });

  // Create version if baseContent changed
  if (data.baseContent !== undefined && data.baseContent !== existingPost.baseContent) {
    await versionService.createVersion(postId, data.baseContent ?? null, userId);
  }

  return formatPostDetail(post);
}

export async function deletePost(postId: string, _userId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true, authorId: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Only block deleting scheduled posts (they have pending publish jobs)
  // Published posts can be deleted - frontend shows warning to delete from platform first
  if (post.status === 'SCHEDULED') {
    throw new AppError(
      'POST_NOT_DELETABLE',
      'Scheduled posts cannot be deleted. Unschedule the post first.',
      400
    );
  }

  await prisma.post.delete({ where: { id: postId } });
}

// ============================================
// STATUS WORKFLOW
// ============================================

export async function submitForApproval(postId: string, _userId: string): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      status: true,
      authorId: true,
      channels: { select: { id: true } },
    },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (post.status !== 'DRAFT') {
    throw new AppError('INVALID_STATUS', 'Only drafts can be submitted for approval', 400);
  }

  if (post.channels.length === 0) {
    throw new AppError('NO_CHANNELS', 'Post must have at least one channel to submit', 400);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { status: 'PENDING_APPROVAL' },
    select: postDetailSelect,
  });

  return formatPostDetail(updated);
}

export async function approvePost(postId: string, _approverId: string): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (post.status !== 'PENDING_APPROVAL') {
    throw new AppError('INVALID_STATUS', 'Only posts pending approval can be approved', 400);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { status: 'APPROVED' },
    select: postDetailSelect,
  });

  return formatPostDetail(updated);
}

export async function rejectPost(
  postId: string,
  _rejecterId: string,
  reason: string
): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (post.status !== 'PENDING_APPROVAL') {
    throw new AppError('INVALID_STATUS', 'Only posts pending approval can be rejected', 400);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
    },
    select: postDetailSelect,
  });

  return formatPostDetail(updated);
}

export async function schedulePost(
  postId: string,
  _userId: string,
  data: SchedulePostRequest
): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      status: true,
    },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Only prevent scheduling for already published posts
  if (post.status === 'PUBLISHED') {
    throw new AppError('INVALID_STATUS', 'Published posts cannot be rescheduled', 400);
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (scheduledAt <= new Date()) {
    throw new AppError('INVALID_SCHEDULE', 'Scheduled time must be in the future', 400);
  }

  // Re-query channel count to get fresh data (channels may have just been created)
  const channelCount = await prisma.postChannel.count({
    where: { postId },
  });

  // For drafts without channels, just update scheduledAt and keep as DRAFT
  // This allows users to set a proposed schedule time before adding channels
  if (channelCount === 0) {
    if (post.status !== 'DRAFT') {
      throw new AppError('NO_CHANNELS', 'Post must have at least one channel to schedule', 400);
    }
    // Update just the scheduledAt field, keeping status as DRAFT
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { scheduledAt },
      select: postDetailSelect,
    });
    return formatPostDetail(updated);
  }

  // Update post and channel schedules
  const updated = await prisma.$transaction(async (tx) => {
    // Update individual channel schedules if provided
    if (data.channelSchedules && data.channelSchedules.length > 0) {
      for (const schedule of data.channelSchedules) {
        // Use updateMany to handle channels that may have been created just before this call
        // This avoids issues with stale data in post.channels query
        await tx.postChannel.updateMany({
          where: {
            postId,
            socialAccountId: schedule.socialAccountId,
          },
          data: { scheduledAt: new Date(schedule.scheduledAt) },
        });
      }
    } else {
      // Apply same schedule to all channels
      await tx.postChannel.updateMany({
        where: { postId },
        data: { scheduledAt },
      });
    }

    // Allow DRAFT and APPROVED posts to be scheduled directly
    // Admin/Editor can schedule drafts without approval workflow
    // PENDING_APPROVAL posts keep their status (waiting for approval)
    const newStatus =
      post.status === 'DRAFT' || post.status === 'APPROVED' ? 'SCHEDULED' : post.status;

    return tx.post.update({
      where: { id: postId },
      data: {
        status: newStatus,
        scheduledAt,
      },
      select: postDetailSelect,
    });
  });

  return formatPostDetail(updated);
}

export async function unschedulePost(postId: string, _userId: string): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (post.status !== 'SCHEDULED') {
    throw new AppError('INVALID_STATUS', 'Only scheduled posts can be unscheduled', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Clear channel schedules
    await tx.postChannel.updateMany({
      where: { postId },
      data: { scheduledAt: null },
    });

    return tx.post.update({
      where: { id: postId },
      data: {
        status: 'APPROVED',
        scheduledAt: null,
      },
      select: postDetailSelect,
    });
  });

  return formatPostDetail(updated);
}

// ============================================
// COLLABORATORS
// ============================================

export async function addCollaborator(
  postId: string,
  userId: string,
  assignedById: string
): Promise<PostDetail> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Check if already a collaborator
  const existing = await prisma.collaboratorAssignment.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  if (existing) {
    throw new AppError('ALREADY_COLLABORATOR', 'User is already a collaborator', 400);
  }

  await prisma.collaboratorAssignment.create({
    data: {
      postId,
      userId,
      assignedById,
    },
  });

  // Get assigner name for notification
  const assigner = await prisma.user.findUnique({
    where: { id: assignedById },
    select: { fullName: true },
  });

  // Fire-and-forget notification (don't break add flow)
  notificationService
    .notifyCollaboratorAdded(postId, userId, assigner?.fullName || 'Someone')
    .catch(() => {});

  // Fire-and-forget email notification
  emailService
    .sendCollaboratorAddedEmail({
      recipientEmail: user.email,
      recipientName: user.fullName,
      addedByName: assigner?.fullName || 'Someone',
      postPreview: post.baseContent?.substring(0, 150) || 'No content yet',
      postUrl: `${config.FRONTEND_URL}/posts/${postId}`,
    })
    .catch(() => {});

  // Activity logging (await for audit trail)
  await activityService.logPostActivity(postId, assignedById, ACTIVITY_ACTIONS.COLLABORATOR_ADDED, {
    collaboratorId: userId,
    collaboratorName: user.fullName,
  });

  return getPostById(postId);
}

export async function removeCollaborator(
  postId: string,
  userId: string,
  removedById: string
): Promise<PostDetail> {
  const assignment = await prisma.collaboratorAssignment.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  if (!assignment) {
    throw new AppError('NOT_COLLABORATOR', 'User is not a collaborator on this post', 404);
  }

  // Fetch collaborator name for activity log before deleting
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  await prisma.collaboratorAssignment.delete({
    where: {
      postId_userId: { postId, userId },
    },
  });

  // Activity logging
  await activityService.logPostActivity(
    postId,
    removedById,
    ACTIVITY_ACTIONS.COLLABORATOR_REMOVED,
    {
      collaboratorId: userId,
      collaboratorName: user?.fullName,
    }
  );

  return getPostById(postId);
}

// ============================================
// AUTOSAVE
// ============================================

export interface AutosaveRequest {
  baseContent: string;
  lastModified?: string; // ISO timestamp for conflict detection
}

export interface AutosaveResponse {
  success: boolean;
  savedAt: string;
  updatedAt: string;
  conflict?: boolean;
  serverContent?: string;
}

/**
 * Autosave post content with conflict detection.
 * Returns 409 if the post was modified elsewhere since lastModified.
 */
export async function autosavePost(
  postId: string,
  _userId: string, // Reserved for future use (e.g., activity logging)
  data: AutosaveRequest
): Promise<AutosaveResponse> {
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true, baseContent: true, updatedAt: true },
  });

  if (!existingPost) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Only allow autosave in editable states
  if (!['DRAFT', 'REJECTED', 'APPROVED'].includes(existingPost.status)) {
    throw new AppError('POST_NOT_EDITABLE', 'Post cannot be edited in its current status', 400);
  }

  // Check for conflicts if lastModified is provided
  if (data.lastModified) {
    const clientLastModified = new Date(data.lastModified);
    const serverLastModified = existingPost.updatedAt;

    // If server version is newer than client's known version, there's a conflict
    if (serverLastModified > clientLastModified) {
      throw new AppError('CONFLICT', 'Post was modified elsewhere', 409, {
        conflict: true,
        serverContent: existingPost.baseContent,
        serverUpdatedAt: serverLastModified.toISOString(),
      });
    }
  }

  // Skip save if content hasn't changed
  if (existingPost.baseContent === data.baseContent) {
    return {
      success: true,
      savedAt: new Date().toISOString(),
      updatedAt: existingPost.updatedAt.toISOString(),
    };
  }

  // Save the content
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: { baseContent: data.baseContent },
    select: { updatedAt: true },
  });

  return {
    success: true,
    savedAt: new Date().toISOString(),
    updatedAt: updatedPost.updatedAt.toISOString(),
  };
}
