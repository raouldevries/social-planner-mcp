/**
 * Social Planner - Scheduler Service
 *
 * Handles scheduled publishing of posts and channels using BullMQ.
 * Processes due items and publishes them to social platforms.
 */

import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { logger } from '../lib/logger';
import * as channelService from './channel.service';
import * as publisherService from './publisher.service';
import * as analyticsSyncService from './analytics-sync.service';
import { initializeAnalyticsAdapters } from './adapters';
import { prisma } from '../lib/prisma';
import { resolveMediaUrl } from '../lib/media-utils';

// ============================================
// QUEUE CONFIGURATION
// ============================================

const QUEUE_NAME = 'publishing';
const SCHEDULER_QUEUE_NAME = 'scheduler';
const ANALYTICS_SYNC_QUEUE_NAME = 'analytics-sync';

// Parse Redis URL for BullMQ connection
// Handles URLs with password, database, and various formats
function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  db?: number;
} {
  const parsed = new URL(url);
  const result: { host: string; port: number; password?: string; db?: number } = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379'),
  };

  // Handle password (redis://:password@host or redis://user:password@host)
  if (parsed.password) {
    result.password = decodeURIComponent(parsed.password);
  }

  // Handle database number in path (redis://host:port/0)
  if (parsed.pathname && parsed.pathname.length > 1) {
    const db = parseInt(parsed.pathname.slice(1));
    if (!isNaN(db)) {
      result.db = db;
    }
  }

  return result;
}

const connection = parseRedisUrl(config.REDIS_URL);

// ============================================
// QUEUES
// ============================================

export const publishingQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const schedulerQueue = new Queue(SCHEDULER_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 10,
  },
});

export const analyticsSyncQueue = new Queue(ANALYTICS_SYNC_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 10,
  },
});

// ============================================
// JOB TYPES
// ============================================

interface PublishChannelJob {
  type: 'publish-channel';
  channelId: string;
  postId: string;
  socialAccountId: string;
  platform: string;
  platformAccountId: string;
  content: string;
  accessToken: string;
  mediaUrls?: string[];
  retryCount?: number;
}

interface CheckScheduledJob {
  type: 'check-scheduled';
  timestamp: number;
}

interface AnalyticsSyncJob {
  type: 'sync-analytics';
  timestamp: number;
}

// ============================================
// WORKERS
// ============================================

let publishingWorker: Worker | null = null;
let schedulerWorker: Worker | null = null;
let analyticsSyncWorker: Worker | null = null;

/**
 * Process a publishing job
 */
async function processPublishingJob(job: Job<PublishChannelJob>): Promise<void> {
  const { channelId, postId, platform, platformAccountId, content, accessToken, mediaUrls } =
    job.data;

  logger.info({ jobId: job.id, channelId, platform }, 'Processing publishing job');

  try {
    // Publish to the social platform
    const result = await publisherService.publish({
      platform,
      content,
      accessToken,
      platformAccountId,
      ...(mediaUrls && { mediaUrls }),
    });

    if (result.success && result.platformPostId) {
      // Mark channel as published (pass postId as fallback if channel was recreated)
      await channelService.markChannelPublished(
        channelId,
        result.platformPostId,
        result.publishedUrl,
        postId
      );
      logger.info(
        { channelId, platformPostId: result.platformPostId },
        'Channel published successfully'
      );
    } else {
      throw new Error(result.error || 'Unknown publishing error');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ channelId, error: errorMessage }, 'Publishing job failed');

    // If this is the final attempt, mark as failed
    if (job.attemptsMade >= (job.opts?.attempts ?? 3) - 1) {
      await channelService.markChannelFailed(channelId, errorMessage);
    }

    throw error; // Re-throw for BullMQ retry handling
  }
}

/**
 * Check for scheduled channels and queue them for publishing
 */
async function processSchedulerJob(job: Job<CheckScheduledJob>): Promise<void> {
  logger.debug({ jobId: job.id }, 'Checking for scheduled channels');

  const channels = await channelService.getChannelsReadyForPublishing();

  if (channels.length === 0) {
    logger.debug('No channels ready for publishing');
    return;
  }

  logger.info({ count: channels.length }, 'Found channels ready for publishing');

  // Queue each channel for publishing (stable jobId prevents duplicate jobs)
  for (const channel of channels) {
    const content = channel.customContent || channel.baseContent || '';

    try {
      await publishingQueue.add(
        'publish-channel',
        {
          type: 'publish-channel',
          channelId: channel.id,
          postId: channel.postId,
          socialAccountId: channel.socialAccountId,
          platform: channel.platform,
          platformAccountId: channel.platformAccountId,
          content,
          accessToken: channel.accessToken,
          mediaUrls: channel.mediaUrls,
        } satisfies PublishChannelJob,
        {
          jobId: `publish-${channel.id}`,
        }
      );
    } catch {
      // Job with this ID already exists (channel already queued) — skip
    }
  }
}

/**
 * Process an analytics sync job
 */
async function processAnalyticsSyncJob(job: Job<AnalyticsSyncJob>): Promise<void> {
  logger.info({ jobId: job.id }, 'Starting scheduled analytics sync');

  try {
    const result = await analyticsSyncService.syncAllAnalytics();
    logger.info(
      { jobId: job.id, synced: result.synced, failed: result.failed, skipped: result.skipped },
      'Scheduled analytics sync completed'
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ jobId: job.id, error: errorMessage }, 'Scheduled analytics sync failed');
    throw error;
  }
}

/**
 * Start the scheduler workers
 */
export async function startScheduler(): Promise<void> {
  logger.info('Starting scheduler workers...');

  // Publishing worker - handles individual publish jobs
  publishingWorker = new Worker<PublishChannelJob>(QUEUE_NAME, processPublishingJob, {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  });

  publishingWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Publishing job completed');
  });

  publishingWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Publishing job failed');
  });

  // Scheduler worker - checks for due channels
  schedulerWorker = new Worker<CheckScheduledJob>(SCHEDULER_QUEUE_NAME, processSchedulerJob, {
    connection,
    concurrency: 1,
  });

  // Set up recurring job to check for scheduled channels every minute
  await schedulerQueue.add(
    'check-scheduled',
    { type: 'check-scheduled', timestamp: Date.now() } satisfies CheckScheduledJob,
    {
      repeat: {
        every: 60000, // Every 60 seconds
      },
      jobId: 'scheduler-recurring',
    }
  );

  // Initialize analytics adapters
  initializeAnalyticsAdapters();

  // Analytics sync worker - syncs analytics data from social platforms
  if (analyticsSyncService.isSyncEnabled()) {
    analyticsSyncWorker = new Worker<AnalyticsSyncJob>(
      ANALYTICS_SYNC_QUEUE_NAME,
      processAnalyticsSyncJob,
      {
        connection,
        concurrency: 1,
      }
    );

    analyticsSyncWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Analytics sync job completed');
    });

    analyticsSyncWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Analytics sync job failed');
    });

    // Set up recurring analytics sync based on config interval
    const intervalMs = config.ANALYTICS_SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
    await analyticsSyncQueue.add(
      'sync-analytics',
      { type: 'sync-analytics', timestamp: Date.now() } satisfies AnalyticsSyncJob,
      {
        repeat: {
          every: intervalMs,
        },
        jobId: 'analytics-sync-recurring',
      }
    );

    logger.info(
      { intervalHours: config.ANALYTICS_SYNC_INTERVAL_HOURS },
      'Analytics sync scheduler initialized'
    );
  }

  logger.info('Scheduler workers started');
}

/**
 * Stop the scheduler workers gracefully
 */
export async function stopScheduler(): Promise<void> {
  logger.info('Stopping scheduler workers...');

  if (publishingWorker) {
    await publishingWorker.close();
    publishingWorker = null;
  }

  if (schedulerWorker) {
    await schedulerWorker.close();
    schedulerWorker = null;
  }

  if (analyticsSyncWorker) {
    await analyticsSyncWorker.close();
    analyticsSyncWorker = null;
  }

  await publishingQueue.close();
  await schedulerQueue.close();
  await analyticsSyncQueue.close();

  logger.info('Scheduler workers stopped');
}

// ============================================
// MANUAL PUBLISHING
// ============================================

/**
 * Manually trigger publishing for a specific channel
 */
export async function publishChannelNow(channelId: string, userId: string): Promise<void> {
  // Get channel with required data including authorization info
  const channel = await prisma.postChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      postId: true,
      socialAccountId: true,
      status: true,
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
          status: true,
          baseContent: true,
          authorId: true,
          collaborators: {
            select: { userId: true },
          },
          media: {
            select: {
              mediaAsset: {
                select: { storagePath: true },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  // Verify user has access to publish this channel
  const isAuthor = channel.post.authorId === userId;
  const isCollaborator = channel.post.collaborators.some((c) => c.userId === userId);

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAuthor && !isCollaborator && !isAdmin) {
    throw new Error('You do not have permission to publish this channel');
  }

  if (channel.status !== 'PENDING') {
    throw new Error('Channel is not pending');
  }

  if (!['APPROVED', 'SCHEDULED'].includes(channel.post.status)) {
    throw new Error('Post must be approved before publishing');
  }

  const content = channel.customContent || channel.post.baseContent || '';
  const mediaUrls = channel.post.media.map((m) => resolveMediaUrl(m.mediaAsset.storagePath));

  // Queue for immediate publishing
  await publishingQueue.add(
    'publish-channel',
    {
      type: 'publish-channel',
      channelId: channel.id,
      postId: channel.postId,
      socialAccountId: channel.socialAccountId,
      platform: channel.socialAccount.platform,
      platformAccountId: channel.socialAccount.platformAccountId,
      content,
      accessToken: channel.socialAccount.accessToken,
      mediaUrls,
    } satisfies PublishChannelJob,
    {
      jobId: `publish-now-${channel.id}-${Date.now()}`,
      priority: 1, // High priority for manual triggers
    }
  );

  logger.info({ channelId, userId }, 'Channel queued for immediate publishing');
}

/**
 * Publish all pending channels on a post immediately
 */
export async function publishPostNow(postId: string, userId: string): Promise<void> {
  // Get post with all pending channels and authorization info
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      baseContent: true,
      authorId: true,
      collaborators: {
        select: { userId: true },
      },
      media: {
        select: {
          mediaAsset: {
            select: { storagePath: true },
          },
        },
        orderBy: { position: 'asc' },
      },
      channels: {
        where: { status: 'PENDING' },
        select: {
          id: true,
          socialAccountId: true,
          customContent: true,
          socialAccount: {
            select: {
              platform: true,
              platformAccountId: true,
              accessToken: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  // Verify user has access to publish this post
  const isAuthor = post.authorId === userId;
  const isCollaborator = post.collaborators.some((c) => c.userId === userId);

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAuthor && !isCollaborator && !isAdmin) {
    throw new Error('You do not have permission to publish this post');
  }

  if (!['APPROVED', 'SCHEDULED'].includes(post.status)) {
    throw new Error('Post must be approved before publishing');
  }

  if (post.channels.length === 0) {
    throw new Error('No pending channels to publish');
  }

  // Queue all channels for publishing
  const mediaUrls = post.media.map((m) => resolveMediaUrl(m.mediaAsset.storagePath));

  for (const channel of post.channels) {
    const content = channel.customContent || post.baseContent || '';

    await publishingQueue.add(
      'publish-channel',
      {
        type: 'publish-channel',
        channelId: channel.id,
        postId: post.id,
        socialAccountId: channel.socialAccountId,
        platform: channel.socialAccount.platform,
        platformAccountId: channel.socialAccount.platformAccountId,
        content,
        accessToken: channel.socialAccount.accessToken,
        mediaUrls,
      } satisfies PublishChannelJob,
      {
        jobId: `publish-now-${channel.id}-${Date.now()}`,
        priority: 1,
      }
    );
  }

  logger.info(
    { postId, channelCount: post.channels.length, userId },
    'Post channels queued for immediate publishing'
  );
}

// ============================================
// QUEUE STATS
// ============================================

export interface QueueStats {
  publishing: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  scheduler: {
    waiting: number;
    active: number;
  };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const [
    publishingWaiting,
    publishingActive,
    publishingCompleted,
    publishingFailed,
    publishingDelayed,
  ] = await Promise.all([
    publishingQueue.getWaitingCount(),
    publishingQueue.getActiveCount(),
    publishingQueue.getCompletedCount(),
    publishingQueue.getFailedCount(),
    publishingQueue.getDelayedCount(),
  ]);

  const [schedulerWaiting, schedulerActive] = await Promise.all([
    schedulerQueue.getWaitingCount(),
    schedulerQueue.getActiveCount(),
  ]);

  return {
    publishing: {
      waiting: publishingWaiting,
      active: publishingActive,
      completed: publishingCompleted,
      failed: publishingFailed,
      delayed: publishingDelayed,
    },
    scheduler: {
      waiting: schedulerWaiting,
      active: schedulerActive,
    },
  };
}

/**
 * Clear failed jobs from the publishing queue
 */
export async function clearFailedJobs(): Promise<number> {
  const failed = await publishingQueue.getFailed();

  for (const job of failed) {
    await job.remove();
  }

  return failed.length;
}
