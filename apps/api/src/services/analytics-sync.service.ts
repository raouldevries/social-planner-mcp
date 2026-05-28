/**
 * Social Planner - Analytics Sync Service
 *
 * Fetches real analytics data from social media platforms
 * and updates PostAnalytics records.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import type { SocialPlatform } from '@social-planner/database';

// ============================================
// TYPES
// ============================================

export interface AnalyticsMetrics {
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface SyncResult {
  channelId: string;
  success: boolean;
  metrics?: AnalyticsMetrics;
  error?: string;
}

export interface PlatformAnalyticsAdapter {
  fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    platformAccountId: string
  ): Promise<AnalyticsMetrics | null>;
}

export interface SyncAllOptions {
  fromDate?: Date;
  toDate?: Date;
  platform?: SocialPlatform;
}

export interface SyncAllResult {
  synced: number;
  failed: number;
  skipped: number;
}

// ============================================
// ADAPTER REGISTRY
// ============================================

const adapters: Record<string, PlatformAnalyticsAdapter> = {};

export function registerAdapter(platform: SocialPlatform, adapter: PlatformAnalyticsAdapter): void {
  adapters[platform] = adapter;
}

export function getAdapter(platform: SocialPlatform): PlatformAnalyticsAdapter | undefined {
  return adapters[platform];
}

// ============================================
// ELIGIBILITY CHECKS
// ============================================

/**
 * Check if a channel is eligible for sync based on post age
 */
function isEligibleForSync(publishedAt: Date | null): boolean {
  if (!publishedAt) {
    return false;
  }

  const minAgeMs = config.ANALYTICS_MIN_POST_AGE_HOURS * 60 * 60 * 1000;
  const postAgeMs = Date.now() - publishedAt.getTime();

  return postAgeMs >= minAgeMs;
}

/**
 * Check if a channel was recently synced (within interval window)
 */
function wasRecentlySynced(syncedAt: Date | null): boolean {
  if (!syncedAt) {
    return false;
  }

  const intervalMs = config.ANALYTICS_SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
  const timeSinceSync = Date.now() - syncedAt.getTime();

  return timeSinceSync < intervalMs;
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Sync analytics for a single channel
 */
export async function syncChannelAnalytics(channelId: string): Promise<SyncResult> {
  try {
    // Get channel with social account and access token
    const channel = await prisma.postChannel.findUnique({
      where: { id: channelId },
      include: {
        socialAccount: {
          select: {
            id: true,
            platform: true,
            accessToken: true,
            platformAccountId: true,
          },
        },
        analytics: {
          select: {
            syncedAt: true,
          },
        },
      },
    });

    if (!channel) {
      return { channelId, success: false, error: 'Channel not found' };
    }

    if (!channel.platformPostId) {
      return { channelId, success: false, error: 'No platform post ID - post not published' };
    }

    if (channel.status !== 'PUBLISHED') {
      return { channelId, success: false, error: 'Channel not in PUBLISHED status' };
    }

    // Check post age eligibility
    if (!isEligibleForSync(channel.publishedAt)) {
      return {
        channelId,
        success: false,
        error: `Post too recent (min age: ${config.ANALYTICS_MIN_POST_AGE_HOURS}h)`,
      };
    }

    // Check if recently synced
    if (channel.analytics && wasRecentlySynced(channel.analytics.syncedAt)) {
      return {
        channelId,
        success: false,
        error: `Recently synced (interval: ${config.ANALYTICS_SYNC_INTERVAL_HOURS}h)`,
      };
    }

    const { socialAccount } = channel;
    const adapter = adapters[socialAccount.platform];

    if (!adapter) {
      return {
        channelId,
        success: false,
        error: `No adapter for platform: ${socialAccount.platform}`,
      };
    }

    if (!socialAccount.accessToken) {
      return { channelId, success: false, error: 'Social account access token expired or missing' };
    }

    // Fetch metrics from platform API
    const metrics = await adapter.fetchAnalytics(
      channel.platformPostId,
      socialAccount.accessToken,
      socialAccount.platformAccountId || ''
    );

    if (!metrics) {
      return { channelId, success: false, error: 'Failed to fetch metrics from platform' };
    }

    // Upsert analytics record
    await prisma.postAnalytics.upsert({
      where: { channelId },
      create: {
        channelId,
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: metrics.engagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        clicks: metrics.clicks,
        syncedAt: new Date(),
        rawData: { source: 'api', platform: socialAccount.platform },
      },
      update: {
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: metrics.engagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        clicks: metrics.clicks,
        syncedAt: new Date(),
        rawData: { source: 'api', platform: socialAccount.platform },
      },
    });

    logger.info(
      { channelId, platform: socialAccount.platform, metrics },
      'Analytics synced successfully'
    );

    return { channelId, success: true, metrics };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ channelId, error: errorMessage }, 'Failed to sync channel analytics');
    return { channelId, success: false, error: errorMessage };
  }
}

/**
 * Sync analytics for all published posts within a date range
 */
export async function syncAllAnalytics(options?: SyncAllOptions): Promise<SyncAllResult> {
  const { fromDate, toDate, platform } = options || {};

  // Default: sync posts from last 90 days
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 90);

  // Find all published channels that need syncing
  const channels = await prisma.postChannel.findMany({
    where: {
      status: 'PUBLISHED',
      platformPostId: { not: null },
      publishedAt: {
        gte: fromDate || defaultFromDate,
        ...(toDate && { lte: toDate }),
      },
      ...(platform && {
        socialAccount: { platform },
      }),
    },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const channel of channels) {
    const result = await syncChannelAnalytics(channel.id);

    if (result.success) {
      synced++;
    } else if (
      result.error?.includes('No adapter') ||
      result.error?.includes('Recently synced') ||
      result.error?.includes('too recent')
    ) {
      skipped++;
    } else {
      failed++;
    }
  }

  logger.info(
    { synced, failed, skipped, total: channels.length },
    'Analytics sync batch completed'
  );

  return { synced, failed, skipped };
}

/**
 * Manual trigger for syncing a specific post's analytics across all channels
 */
export async function syncPostAnalytics(postId: string): Promise<SyncResult[]> {
  const channels = await prisma.postChannel.findMany({
    where: {
      postId,
      status: 'PUBLISHED',
      platformPostId: { not: null },
    },
    select: { id: true },
  });

  const results: SyncResult[] = [];

  for (const channel of channels) {
    const result = await syncChannelAnalytics(channel.id);
    results.push(result);
  }

  return results;
}

/**
 * Check if analytics sync is enabled
 */
export function isSyncEnabled(): boolean {
  return config.ANALYTICS_SYNC_ENABLED;
}
