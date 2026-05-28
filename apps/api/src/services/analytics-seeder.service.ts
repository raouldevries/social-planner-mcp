/**
 * Social Planner - Analytics Seeder Service
 *
 * Generates realistic analytics data for posts in development mode.
 * Used when posts are published to seed initial analytics.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { PostAnalytics, SocialPlatform } from '@social-planner/database';

// ============================================
// TYPES
// ============================================

interface AnalyticsMetrics {
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate platform-specific engagement patterns
 */
function generateMetricsForPlatform(platform: SocialPlatform): AnalyticsMetrics {
  // Base impressions - Instagram tends to get more impressions
  const baseImpressions = platform === 'INSTAGRAM' ? randomInt(1000, 8000) : randomInt(500, 4000);

  // Reach is typically 70-90% of impressions
  const reachRate = randomInt(70, 90) / 100;
  const reach = Math.floor(baseImpressions * reachRate);

  // Engagement rate varies by platform
  // Instagram: 1-5%, LinkedIn: 2-8% (LinkedIn has higher professional engagement)
  const engagementRate =
    platform === 'INSTAGRAM'
      ? randomInt(10, 50) / 1000 // 1-5%
      : randomInt(20, 80) / 1000; // 2-8%

  const engagements = Math.floor(baseImpressions * engagementRate);

  // Distribution of engagement types varies by platform
  if (platform === 'INSTAGRAM') {
    // Instagram: More likes, saves, less shares
    const likes = Math.floor((engagements * randomInt(65, 80)) / 100);
    const comments = Math.floor((engagements * randomInt(8, 15)) / 100);
    const shares = Math.floor((engagements * randomInt(3, 8)) / 100);
    const saves = Math.floor((engagements * randomInt(5, 12)) / 100);
    const clicks = Math.floor((baseImpressions * randomInt(15, 35)) / 1000); // 1.5-3.5% CTR

    return {
      impressions: baseImpressions,
      reach,
      engagements,
      likes,
      comments,
      shares,
      saves,
      clicks,
    };
  } else {
    // LinkedIn: More shares, clicks, less saves
    const likes = Math.floor((engagements * randomInt(50, 65)) / 100);
    const comments = Math.floor((engagements * randomInt(15, 25)) / 100);
    const shares = Math.floor((engagements * randomInt(12, 22)) / 100);
    const saves = Math.floor((engagements * randomInt(2, 6)) / 100);
    const clicks = Math.floor((baseImpressions * randomInt(25, 50)) / 1000); // 2.5-5% CTR

    return {
      impressions: baseImpressions,
      reach,
      engagements,
      likes,
      comments,
      shares,
      saves,
      clicks,
    };
  }
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Seed analytics for a specific channel
 * Called when a post channel is published
 */
export async function seedChannelAnalytics(channelId: string): Promise<PostAnalytics | null> {
  try {
    // Get channel with platform info
    const channel = await prisma.postChannel.findUnique({
      where: { id: channelId },
      include: {
        socialAccount: {
          select: { platform: true },
        },
      },
    });

    if (!channel) {
      logger.warn({ channelId }, 'Channel not found for analytics seeding');
      return null;
    }

    // Check if analytics already exist
    const existing = await prisma.postAnalytics.findUnique({
      where: { channelId },
    });

    if (existing) {
      logger.debug({ channelId }, 'Analytics already exist for channel');
      return existing;
    }

    // Generate platform-specific metrics
    const platform = channel.socialAccount.platform as SocialPlatform;
    const metrics = generateMetricsForPlatform(platform);

    // Create analytics record
    const analytics = await prisma.postAnalytics.create({
      data: {
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
        rawData: {
          source: 'seeder',
          platform,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    logger.info(
      { channelId, platform, impressions: metrics.impressions },
      'Seeded analytics for channel'
    );

    return analytics;
  } catch (error) {
    logger.error({ channelId, error }, 'Failed to seed channel analytics');
    throw error;
  }
}

/**
 * Seed analytics for all channels of a post
 * Called when an entire post is published
 */
export async function seedPostAnalytics(postId: string): Promise<PostAnalytics[]> {
  try {
    // Get all published channels for this post
    const channels = await prisma.postChannel.findMany({
      where: {
        postId,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (channels.length === 0) {
      logger.debug({ postId }, 'No published channels to seed analytics for');
      return [];
    }

    const results: PostAnalytics[] = [];

    for (const channel of channels) {
      const analytics = await seedChannelAnalytics(channel.id);
      if (analytics) {
        results.push(analytics);
      }
    }

    logger.info({ postId, channelCount: results.length }, 'Seeded analytics for post');

    return results;
  } catch (error) {
    logger.error({ postId, error }, 'Failed to seed post analytics');
    throw error;
  }
}

/**
 * Seed analytics for all published posts that don't have analytics
 * Used for initial seeding of existing data
 */
export async function seedAllMissingAnalytics(): Promise<{ seeded: number; skipped: number }> {
  try {
    // Find all published channels without analytics
    const channelsWithoutAnalytics = await prisma.postChannel.findMany({
      where: {
        status: 'PUBLISHED',
        analytics: null,
      },
      select: { id: true },
    });

    let seeded = 0;
    let skipped = 0;

    for (const channel of channelsWithoutAnalytics) {
      try {
        await seedChannelAnalytics(channel.id);
        seeded++;
      } catch {
        skipped++;
      }
    }

    logger.info({ seeded, skipped }, 'Completed seeding all missing analytics');

    return { seeded, skipped };
  } catch (error) {
    logger.error({ error }, 'Failed to seed all missing analytics');
    throw error;
  }
}

/**
 * Update analytics with slight variations (simulate organic growth)
 * Can be called periodically by a worker
 */
export async function updateAnalyticsWithVariation(
  channelId: string
): Promise<PostAnalytics | null> {
  try {
    const existing = await prisma.postAnalytics.findUnique({
      where: { channelId },
    });

    if (!existing) {
      return null;
    }

    // Add small random variations (1-5% increase)
    const variationRate = 1 + randomInt(1, 5) / 100;

    const updated = await prisma.postAnalytics.update({
      where: { channelId },
      data: {
        impressions: Math.floor(existing.impressions * variationRate),
        reach: Math.floor(existing.reach * variationRate),
        engagements: Math.floor(existing.engagements * variationRate),
        likes: Math.floor(existing.likes * variationRate),
        comments: existing.comments + randomInt(0, 2),
        shares: existing.shares + randomInt(0, 1),
        saves: existing.saves + randomInt(0, 1),
        clicks: Math.floor(existing.clicks * variationRate),
        syncedAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    logger.error({ channelId, error }, 'Failed to update analytics with variation');
    throw error;
  }
}
