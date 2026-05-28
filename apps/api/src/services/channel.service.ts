/**
 * Social Planner - Channel Service
 *
 * Handles multi-channel publishing operations.
 * Manages channels on posts, including scheduling and content customization.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { Prisma } from '@social-planner/database';
import type { PostChannelSummary, SocialAccountSummary } from '@social-planner/shared';
import { seedChannelAnalytics } from './analytics-seeder.service';
import { sendAmbassadorPublishedEmails } from './ambassador.service';
import { resolveMediaUrl } from '../lib/media-utils';

// ============================================
// HELPERS
// ============================================

function formatChannelSummary(channel: any): PostChannelSummary {
  return {
    id: channel.id,
    socialAccountId: channel.socialAccountId,
    platform: channel.socialAccount.platform,
    accountName: channel.socialAccount.accountName,
    customContent: channel.customContent,
    scheduledAt: channel.scheduledAt?.toISOString() ?? null,
    status: channel.status,
    publishError: channel.publishError,
    platformPostId: channel.platformPostId,
    publishedAt: channel.publishedAt?.toISOString() ?? null,
  };
}

const channelSelect = {
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
};

// ============================================
// CHANNEL CRUD
// ============================================

export interface AddChannelRequest {
  socialAccountId: string;
  customContent?: string;
  scheduledAt?: string;
}

/**
 * Add a channel to a post
 */
export async function addChannelToPost(
  postId: string,
  data: AddChannelRequest,
  _userId: string
): Promise<PostChannelSummary> {
  // Verify post exists and is editable
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (!['DRAFT', 'REJECTED'].includes(post.status)) {
    throw new AppError(
      'POST_NOT_EDITABLE',
      'Can only add channels to draft or rejected posts',
      400
    );
  }

  // Verify social account exists
  const socialAccount = await prisma.socialAccount.findUnique({
    where: { id: data.socialAccountId },
    select: { id: true },
  });

  if (!socialAccount) {
    throw new AppError('SOCIAL_ACCOUNT_NOT_FOUND', 'Social account not found', 404);
  }

  // Check if channel already exists for this post/account combination
  const existingChannel = await prisma.postChannel.findUnique({
    where: {
      postId_socialAccountId: {
        postId,
        socialAccountId: data.socialAccountId,
      },
    },
  });

  if (existingChannel) {
    throw new AppError('CHANNEL_EXISTS', 'This social account is already added to the post', 400);
  }

  // Create channel
  const channel = await prisma.postChannel.create({
    data: {
      postId,
      socialAccountId: data.socialAccountId,
      customContent: data.customContent ?? null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
    select: channelSelect,
  });

  return formatChannelSummary(channel);
}

/**
 * Update a channel on a post
 */
export async function updateChannel(
  channelId: string,
  data: { customContent?: string; scheduledAt?: string | null },
  _userId: string
): Promise<PostChannelSummary> {
  // Get channel with post status
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      status: true,
      post: {
        select: { status: true },
      },
    },
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  // Check if channel is editable
  if (channel.status !== 'PENDING') {
    throw new AppError('CHANNEL_NOT_EDITABLE', 'Can only edit channels that are pending', 400);
  }

  if (!['DRAFT', 'REJECTED', 'APPROVED', 'SCHEDULED'].includes(channel.post.status)) {
    throw new AppError('POST_NOT_EDITABLE', 'Cannot edit channels on posts in this status', 400);
  }

  // Build update data
  const updateData: Prisma.PostChannelUpdateInput = {};

  if (data.customContent !== undefined) {
    updateData.customContent = data.customContent ?? null;
  }

  if (data.scheduledAt !== undefined) {
    updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  }

  const updated = await prisma.postChannel.update({
    where: { id: channelId },
    data: updateData,
    select: channelSelect,
  });

  return formatChannelSummary(updated);
}

/**
 * Remove a channel from a post
 */
export async function removeChannelFromPost(channelId: string, _userId: string): Promise<void> {
  // Get channel with post status
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      status: true,
      post: {
        select: { status: true },
      },
    },
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  // Check if channel can be removed
  if (channel.status !== 'PENDING') {
    throw new AppError('CHANNEL_NOT_REMOVABLE', 'Can only remove channels that are pending', 400);
  }

  if (!['DRAFT', 'REJECTED'].includes(channel.post.status)) {
    throw new AppError(
      'POST_NOT_EDITABLE',
      'Can only remove channels from draft or rejected posts',
      400
    );
  }

  await prisma.postChannel.delete({ where: { id: channelId } });
}

/**
 * Get channel details
 */
export async function getChannelById(channelId: string): Promise<PostChannelSummary> {
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: channelSelect,
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  return formatChannelSummary(channel);
}

/**
 * Get all channels for a post
 */
export async function getPostChannels(postId: string): Promise<PostChannelSummary[]> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  const channels = await prisma.postChannel.findMany({
    where: { postId },
    select: channelSelect,
    orderBy: { socialAccount: { accountName: 'asc' } },
  });

  return channels.map(formatChannelSummary);
}

// ============================================
// AVAILABLE ACCOUNTS
// ============================================

/**
 * Get available social accounts that can be added to a post
 */
export async function getAvailableAccountsForPost(postId: string): Promise<SocialAccountSummary[]> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      channels: {
        select: { socialAccountId: true },
      },
    },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  // Get IDs of accounts already added to the post
  const usedAccountIds = post.channels.map((ch) => ch.socialAccountId);

  // Get all accounts not already added
  const whereClause: Prisma.SocialAccountWhereInput = {};
  if (usedAccountIds.length > 0) {
    whereClause.id = { notIn: usedAccountIds };
  }

  const accounts = await prisma.socialAccount.findMany({
    where: whereClause,
    select: {
      id: true,
      platform: true,
      accountName: true,
      accountType: true,
      profileImageUrl: true,
      lastSyncAt: true,
      tokenExpiresAt: true,
    },
    orderBy: [{ platform: 'asc' }, { accountName: 'asc' }],
  });

  return accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    accountName: account.accountName,
    accountType: account.accountType,
    profileImageUrl: account.profileImageUrl,
    lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
  }));
}

// ============================================
// CHANNEL SCHEDULING
// ============================================

/**
 * Update channel schedule (individual channel scheduling)
 */
export async function scheduleChannel(
  channelId: string,
  scheduledAt: string,
  _userId: string
): Promise<PostChannelSummary> {
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      status: true,
      post: {
        select: { status: true },
      },
    },
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  if (channel.status !== 'PENDING') {
    throw new AppError(
      'CHANNEL_NOT_SCHEDULABLE',
      'Can only schedule channels that are pending',
      400
    );
  }

  // Post must be approved or scheduled to schedule individual channels
  if (!['APPROVED', 'SCHEDULED'].includes(channel.post.status)) {
    throw new AppError(
      'POST_NOT_APPROVED',
      'Post must be approved before scheduling channels',
      400
    );
  }

  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate <= new Date()) {
    throw new AppError('INVALID_SCHEDULE', 'Schedule time must be in the future', 400);
  }

  const updated = await prisma.postChannel.update({
    where: { id: channelId },
    data: { scheduledAt: scheduleDate },
    select: channelSelect,
  });

  return formatChannelSummary(updated);
}

/**
 * Remove channel schedule
 */
export async function unscheduleChannel(
  channelId: string,
  _userId: string
): Promise<PostChannelSummary> {
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      status: true,
      post: {
        select: { status: true },
      },
    },
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  if (channel.status !== 'PENDING') {
    throw new AppError(
      'CHANNEL_NOT_EDITABLE',
      'Can only unschedule channels that are pending',
      400
    );
  }

  const updated = await prisma.postChannel.update({
    where: { id: channelId },
    data: { scheduledAt: null },
    select: channelSelect,
  });

  return formatChannelSummary(updated);
}

// ============================================
// PUBLISHING STATUS
// ============================================

/**
 * Get channels ready for publishing (scheduled and past due)
 */
export async function getChannelsReadyForPublishing(): Promise<
  Array<{
    id: string;
    postId: string;
    socialAccountId: string;
    platform: string;
    platformAccountId: string;
    customContent: string | null;
    baseContent: string | null;
    accessToken: string;
    mediaUrls: string[];
  }>
> {
  const channels = await prisma.postChannel.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: {
        lte: new Date(),
        not: null,
      },
      post: {
        status: 'SCHEDULED',
      },
    },
    select: {
      id: true,
      postId: true,
      socialAccountId: true,
      customContent: true,
      socialAccount: {
        select: {
          platform: true,
          platformAccountId: true,
          accessToken: true,
        },
      },
      post: {
        select: {
          baseContent: true,
          media: {
            select: {
              mediaAsset: {
                select: {
                  storagePath: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100, // Process in batches
  });

  return channels.map((ch) => ({
    id: ch.id,
    postId: ch.postId,
    socialAccountId: ch.socialAccountId,
    platform: ch.socialAccount.platform,
    platformAccountId: ch.socialAccount.platformAccountId,
    customContent: ch.customContent,
    baseContent: ch.post.baseContent,
    accessToken: ch.socialAccount.accessToken,
    mediaUrls: ch.post.media.map((m) => resolveMediaUrl(m.mediaAsset.storagePath)),
  }));
}

/**
 * Mark channel as published
 */
export async function markChannelPublished(
  channelId: string,
  platformPostId: string,
  publishedUrl?: string,
  postId?: string
): Promise<void> {
  // Try to update the channel - it may have been deleted+recreated by a post update
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: { id: true, postId: true },
  });

  if (channel) {
    await prisma.postChannel.update({
      where: { id: channelId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformPostId,
        publishedUrl: publishedUrl ?? null,
        publishError: null,
      },
    });

    // Seed analytics for this channel (only in development mode)
    if (process.env.NODE_ENV !== 'production') {
      try {
        await seedChannelAnalytics(channelId);
      } catch (error) {
        logger.warn({ channelId, error }, 'Failed to seed analytics for published channel');
      }
    }
  } else {
    // Channel was deleted+recreated — do NOT update post status since we can't
    // confirm the publishing actually succeeded for the current channels
    logger.warn(
      { channelId, postId },
      'Channel not found during markChannelPublished — skipping post status update'
    );
    return;
  }

  // Only check post status when we successfully updated the channel above
  const pendingChannels = await prisma.postChannel.count({
    where: {
      postId: channel.postId,
      status: 'PENDING',
    },
  });

  // If no more pending channels, mark post as published
  if (pendingChannels === 0) {
    await prisma.post.update({
      where: { id: channel.postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    sendAmbassadorPublishedEmails(channel.postId).catch((error) => {
      logger.error({ postId: channel.postId, error }, 'Failed to send ambassador emails');
    });
  }
}

/**
 * Mark channel as failed
 */
export async function markChannelFailed(channelId: string, error: string): Promise<void> {
  // Channel may have been deleted+recreated by a post update — handle gracefully
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: { postId: true },
  });

  if (channel) {
    await prisma.postChannel.update({
      where: { id: channelId },
      data: {
        status: 'FAILED',
        publishError: error,
      },
    });
  } else {
    logger.warn({ channelId }, 'Channel not found during markChannelFailed (likely recreated)');
    return;
  }

  if (channel) {
    const pendingChannels = await prisma.postChannel.count({
      where: {
        postId: channel.postId,
        status: 'PENDING',
      },
    });

    if (pendingChannels === 0) {
      // Check if at least one channel was published successfully
      const publishedChannels = await prisma.postChannel.count({
        where: {
          postId: channel.postId,
          status: 'PUBLISHED',
        },
      });

      if (publishedChannels > 0) {
        // At least one channel succeeded — mark post as published
        await prisma.post.update({
          where: { id: channel.postId },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        sendAmbassadorPublishedEmails(channel.postId).catch((err) => {
          logger.error({ postId: channel.postId, error: err }, 'Failed to send ambassador emails');
        });
      }
    }
  }
}

/**
 * Retry a failed channel
 */
export async function retryFailedChannel(
  channelId: string,
  _userId: string
): Promise<PostChannelSummary> {
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      postId: true,
      status: true,
      post: {
        select: { status: true },
      },
    },
  });

  if (!channel) {
    throw new AppError('CHANNEL_NOT_FOUND', 'Channel not found', 404);
  }

  if (channel.status !== 'FAILED') {
    throw new AppError('CHANNEL_NOT_FAILED', 'Can only retry failed channels', 400);
  }

  // Reset to pending with a new schedule (now + 1 minute)
  const updated = await prisma.postChannel.update({
    where: { id: channelId },
    data: {
      status: 'PENDING',
      publishError: null,
      scheduledAt: new Date(Date.now() + 60 * 1000),
    },
    select: channelSelect,
  });

  // Make sure post is still scheduled
  if (channel.post.status !== 'SCHEDULED') {
    await prisma.post.update({
      where: { id: channel.postId },
      data: { status: 'SCHEDULED' },
    });
  }

  return formatChannelSummary(updated);
}
