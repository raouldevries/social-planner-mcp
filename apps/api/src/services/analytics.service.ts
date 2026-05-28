/**
 * Social Planner - Analytics Service
 *
 * Queries and aggregates analytics data from PostAnalytics records.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type {
  PostAnalyticsSummary,
  PostAnalyticsDetail,
  ChannelAnalyticsSummary,
  AnalyticsDashboard,
  SocialPlatform,
} from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

export interface AnalyticsFilters {
  fromDate: string;
  toDate: string;
  platform?: SocialPlatform | undefined;
}

interface ChannelAnalyticsRow {
  id: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  syncedAt: Date;
  channel: {
    id: string;
    postId: string;
    publishedAt: Date | null;
    post: {
      id: string;
      baseContent: string | null;
    };
    socialAccount: {
      platform: string;
    };
  };
}

/**
 * Extended analytics row with full social account details
 * Used by getPostAnalytics which needs account name and profile image
 */
interface PostAnalyticsRow {
  id: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  syncedAt: Date;
  channel: {
    id: string;
    postId: string;
    publishedAt: Date | null;
    post: {
      id: string;
      baseContent: string | null;
    };
    socialAccount: {
      id: string;
      platform: string;
      accountName: string;
      profileImageUrl: string | null;
    };
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate and parse date string
 * Returns Date object or throws if invalid
 */
function parseDate(dateStr: string, fieldName: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateStr}`);
  }
  return date;
}

/**
 * Fetch analytics rows with filters
 * Shared query logic for dashboard and top posts
 */
async function fetchAnalyticsRows(filters: AnalyticsFilters): Promise<ChannelAnalyticsRow[]> {
  const fromDate = parseDate(filters.fromDate, 'fromDate');
  const toDate = parseDate(filters.toDate, 'toDate');

  const whereClause = {
    channel: {
      publishedAt: {
        gte: fromDate,
        lte: toDate,
      },
      ...(filters.platform && {
        socialAccount: {
          platform: filters.platform,
        },
      }),
    },
  };

  const analyticsRows = await prisma.postAnalytics.findMany({
    where: whereClause,
    include: {
      channel: {
        include: {
          post: {
            select: {
              id: true,
              baseContent: true,
            },
          },
          socialAccount: {
            select: {
              platform: true,
            },
          },
        },
      },
    },
  });

  return analyticsRows as unknown as ChannelAnalyticsRow[];
}

/**
 * Create empty analytics summary with zero values
 */
function createEmptySummary(): PostAnalyticsSummary {
  return {
    impressions: 0,
    reach: 0,
    engagements: 0,
    engagementRate: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
  };
}

/**
 * Calculate engagement rate safely (avoid division by zero)
 */
function calculateEngagementRate(engagements: number, impressions: number): number {
  if (impressions === 0) {
    return 0;
  }
  return Number(((engagements / impressions) * 100).toFixed(2));
}

/**
 * Aggregate multiple analytics rows into a summary
 */
function aggregateAnalytics(rows: ChannelAnalyticsRow[]): PostAnalyticsSummary {
  const summary = createEmptySummary();

  for (const row of rows) {
    summary.impressions += row.impressions;
    summary.reach += row.reach;
    summary.engagements += row.engagements;
    summary.likes += row.likes;
    summary.comments += row.comments;
    summary.shares += row.shares;
    summary.saves += row.saves;
    summary.clicks += row.clicks;
  }

  summary.engagementRate = calculateEngagementRate(summary.engagements, summary.impressions);

  return summary;
}

/**
 * Group analytics by platform and aggregate
 */
function aggregateByPlatform(
  rows: ChannelAnalyticsRow[]
): Partial<Record<SocialPlatform, PostAnalyticsSummary>> {
  const byPlatform: Partial<Record<SocialPlatform, PostAnalyticsSummary>> = {};

  // Group rows by platform
  const platformGroups = new Map<SocialPlatform, ChannelAnalyticsRow[]>();

  for (const row of rows) {
    const platform = row.channel.socialAccount.platform as SocialPlatform;
    const existing = platformGroups.get(platform) ?? [];
    existing.push(row);
    platformGroups.set(platform, existing);
  }

  // Aggregate each platform group
  for (const [platform, platformRows] of Array.from(platformGroups.entries())) {
    byPlatform[platform] = aggregateAnalytics(platformRows);
  }

  return byPlatform;
}

/**
 * Build time series data from analytics rows
 * Groups by date and aggregates impressions/engagements
 */
function buildTimeSeries(
  rows: ChannelAnalyticsRow[],
  fromDate: string,
  toDate: string
): AnalyticsDashboard['timeSeries'] {
  // Create a map of date -> metrics
  const dateMap = new Map<string, { impressions: number; engagements: number }>();

  // Initialize all dates in range with zeros
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const current = new Date(from);

  while (current <= to) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateStr) {
      dateMap.set(dateStr, { impressions: 0, engagements: 0 });
    }
    current.setDate(current.getDate() + 1);
  }

  // Aggregate analytics by published date
  for (const row of rows) {
    if (!row.channel.publishedAt) continue;

    const dateStr = row.channel.publishedAt.toISOString().split('T')[0];
    if (!dateStr) continue;

    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.impressions += row.impressions;
      existing.engagements += row.engagements;
    }
  }

  // Convert to array sorted by date
  const timeSeries: AnalyticsDashboard['timeSeries'] = [];

  for (const [date, metrics] of Array.from(dateMap.entries())) {
    timeSeries.push({
      date,
      impressions: metrics.impressions,
      engagements: metrics.engagements,
    });
  }

  timeSeries.sort((a, b) => a.date.localeCompare(b.date));

  return timeSeries;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get analytics for the dashboard with filters
 */
export async function getDashboardAnalytics(
  filters: AnalyticsFilters
): Promise<AnalyticsDashboard> {
  const { fromDate, toDate } = filters;

  logger.debug({ filters }, 'Fetching dashboard analytics');

  // Fetch analytics rows using shared helper
  const rows = await fetchAnalyticsRows(filters);

  logger.debug({ rowCount: rows.length }, 'Analytics rows fetched');

  // Aggregate totals
  const aggregate = aggregateAnalytics(rows);

  // Aggregate by platform
  const byPlatform = aggregateByPlatform(rows);

  // Build time series
  const timeSeries = buildTimeSeries(rows, fromDate, toDate);

  // Get top posts by engagement rate
  const topPosts = getTopPostsFromRows(rows, 10);

  return {
    dateRange: {
      from: fromDate,
      to: toDate,
    },
    aggregate,
    byPlatform,
    timeSeries,
    topPosts,
  };
}

/**
 * Extract top posts from analytics rows
 */
function getTopPostsFromRows(
  rows: ChannelAnalyticsRow[],
  limit: number
): AnalyticsDashboard['topPosts'] {
  // Group by post and find best performing channel per post
  const postMap = new Map<
    string,
    {
      postId: string;
      content: string;
      engagementRate: number;
      platform: SocialPlatform;
    }
  >();

  for (const row of rows) {
    const postId = row.channel.postId;
    const engagementRate = calculateEngagementRate(row.engagements, row.impressions);
    const platform = row.channel.socialAccount.platform as SocialPlatform;
    const content = row.channel.post.baseContent ?? '';

    const existing = postMap.get(postId);
    if (!existing || engagementRate > existing.engagementRate) {
      postMap.set(postId, {
        postId,
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        engagementRate,
        platform,
      });
    }
  }

  // Sort by engagement rate and take top N
  const topPosts = Array.from(postMap.values())
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit);

  return topPosts;
}

/**
 * Get analytics for a specific post
 */
export async function getPostAnalytics(postId: string): Promise<PostAnalyticsDetail | null> {
  logger.debug({ postId }, 'Fetching post analytics');

  // Fetch all channel analytics for this post with full social account details
  const analyticsRows = await prisma.postAnalytics.findMany({
    where: {
      channel: {
        postId,
      },
    },
    include: {
      channel: {
        include: {
          post: {
            select: {
              id: true,
              baseContent: true,
            },
          },
          socialAccount: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  if (analyticsRows.length === 0) {
    return null;
  }

  // Cast to our interface type with full social account details
  const rows = analyticsRows as unknown as PostAnalyticsRow[];

  // Aggregate totals
  const aggregate = aggregateAnalytics(rows);

  // Aggregate by platform
  const byPlatform = aggregateByPlatform(rows);

  // Build per-channel analytics
  const byChannel: ChannelAnalyticsSummary[] = analyticsRows.map((row) => {
    const channel = row.channel;
    const socialAccount = channel.socialAccount;

    return {
      channelId: channel.id,
      socialAccountId: socialAccount.id,
      accountName: socialAccount.accountName,
      platform: socialAccount.platform as SocialPlatform,
      profileImageUrl: socialAccount.profileImageUrl,
      metrics: {
        impressions: row.impressions,
        reach: row.reach,
        engagements: row.engagements,
        engagementRate: calculateEngagementRate(row.engagements, row.impressions),
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves,
        clicks: row.clicks,
      },
    };
  });

  // Find most recent sync time
  const latestSync = rows.reduce((latest, row) => {
    return row.syncedAt > latest ? row.syncedAt : latest;
  }, rows[0].syncedAt);

  return {
    postId,
    aggregate,
    byPlatform,
    byChannel,
    syncedAt: latestSync.toISOString(),
  };
}

/**
 * Get top performing posts within a date range
 */
export async function getTopPosts(
  filters: AnalyticsFilters,
  limit = 10
): Promise<AnalyticsDashboard['topPosts']> {
  logger.debug({ filters, limit }, 'Fetching top posts');

  // Fetch analytics rows using shared helper
  const rows = await fetchAnalyticsRows(filters);

  return getTopPostsFromRows(rows, limit);
}
