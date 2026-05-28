/**
 * Instagram Analytics Adapter
 *
 * Fetches post insights using Instagram Graph API.
 *
 * API Documentation:
 * - Media Insights: https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 *
 * Required Permissions:
 * - instagram_basic
 * - instagram_manage_insights
 *
 * Metric Strategy (Graph API v22+, Jan 2025):
 * - Primary set: views, reach, saved, shares, total_interactions
 * - Fallback set: views only (if primary metrics rejected)
 * - Final fallback: media data only (likes, comments)
 *
 * Error Handling:
 * - 400 with "invalid metric" message → try fallback metric set
 * - 400 with other errors → hard failure (don't mask unexpected issues)
 * - 401/403/429 → hard failure (auth/permission/rate-limit issues)
 * - Other errors → hard failure
 *
 * Notes:
 * - 'views' maps to impressions in output for consistent API contract
 * - 'total_interactions' can validate engagement calculation
 * - 'shares' captures reshares when available
 */

import { logger } from '../../lib/logger';
import type { AnalyticsMetrics, PlatformAnalyticsAdapter } from '../analytics-sync.service';

// ============================================
// CONSTANTS
// ============================================

const GRAPH_API_URL = 'https://graph.facebook.com/v22.0';

// Metric sets for progressive fallback (ordered by preference)
const METRIC_SETS = [
  'views,reach,saved,shares,total_interactions', // Full set with shares and interactions
  'views,reach,saved', // Reduced set without shares/interactions
  'views', // Minimal fallback
];

// HTTP status codes that indicate hard failures (not metric rejection)
const HARD_FAILURE_CODES = [401, 403, 429];

// Error messages that indicate metric rejection (safe to fallback)
const METRIC_REJECTION_PATTERNS = [
  'invalid metric',
  'metric is not valid',
  'unsupported metric',
  'not available',
  'does not support',
];

// ============================================
// TYPES
// ============================================

interface InstagramInsight {
  name: string;
  period: string;
  values: { value: number }[];
  title: string;
  description: string;
  id: string;
}

interface InstagramInsightsResponse {
  data: InstagramInsight[];
  error?: {
    message: string;
    code: number;
    error_subcode?: number;
  };
}

interface InstagramMediaResponse {
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_product_type?: string;
  error?: {
    message: string;
    code: number;
  };
}

type FetchInsightsResult =
  | { success: true; data: InstagramInsightsResponse }
  | {
      success: false;
      isHardFailure: boolean;
      status: number;
      error?: InstagramInsightsResponse['error'];
    };

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if error message indicates metric rejection (safe to fallback)
 */
function isMetricRejectionError(errorMessage: string | undefined): boolean {
  if (!errorMessage) return false;
  const lowerMessage = errorMessage.toLowerCase();
  return METRIC_REJECTION_PATTERNS.some((pattern) => lowerMessage.includes(pattern));
}

/**
 * Parse insights array into a key-value map
 */
function parseInsightsToMap(insights: InstagramInsight[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const insight of insights) {
    const value = insight.values[0]?.value;
    if (value !== undefined) {
      map[insight.name] = value;
    }
  }

  return map;
}

/**
 * Build metrics from media data and insights
 * Maps 'views' to 'impressions' for consistent output
 */
function buildMetrics(
  mediaData: InstagramMediaResponse,
  insightsMap: Record<string, number>
): AnalyticsMetrics {
  const likes = mediaData.like_count || 0;
  const comments = mediaData.comments_count || 0;
  const saves = insightsMap.saved || 0;
  const shares = insightsMap.shares || 0;

  // Map 'views' to impressions for consistent API output
  const impressions = insightsMap.views || 0;

  // Use total_interactions if available, otherwise calculate
  const engagements = insightsMap.total_interactions || likes + comments + saves + shares;

  return {
    impressions,
    reach: insightsMap.reach || 0,
    engagements,
    likes,
    comments,
    shares,
    saves,
    clicks: 0, // Instagram doesn't expose clicks for organic posts
  };
}

/**
 * Build fallback metrics when insights API fails completely
 */
function buildFallbackMetrics(mediaData: InstagramMediaResponse): AnalyticsMetrics {
  const likes = mediaData.like_count || 0;
  const comments = mediaData.comments_count || 0;

  return {
    impressions: 0,
    reach: 0,
    engagements: likes + comments,
    likes,
    comments,
    shares: 0,
    saves: 0,
    clicks: 0,
  };
}

// ============================================
// ADAPTER CLASS
// ============================================

export class InstagramAnalyticsAdapter implements PlatformAnalyticsAdapter {
  /**
   * Fetch analytics for an Instagram post
   *
   * @param platformPostId - The Instagram media ID
   * @param accessToken - Facebook/Instagram access token
   * @param _platformAccountId - Instagram Business Account ID (not used for insights)
   */
  async fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    _platformAccountId: string
  ): Promise<AnalyticsMetrics | null> {
    try {
      logger.debug({ platformPostId }, 'Fetching Instagram analytics');

      // Step 1: Get basic media info (likes, comments, media_type)
      const mediaData = await this.fetchMediaInfo(platformPostId, accessToken);
      if (!mediaData) {
        return null;
      }

      // Step 2: Try fetching insights with progressive fallback
      const insightsResult = await this.fetchInsightsWithFallback(platformPostId, accessToken);

      if (!insightsResult.success) {
        if (insightsResult.isHardFailure) {
          // Auth/rate-limit error - don't mask it
          logger.error(
            { platformPostId, status: insightsResult.status, error: insightsResult.error },
            'Instagram insights hard failure (auth/rate-limit)'
          );
          return null;
        }
        // All metric sets rejected - return partial data from media endpoint
        logger.warn({ platformPostId }, 'All insight metrics rejected, using media data only');
        return buildFallbackMetrics(mediaData);
      }

      // Step 3: Parse and build metrics
      const insightsMap = parseInsightsToMap(insightsResult.data.data);
      const metrics = buildMetrics(mediaData, insightsMap);

      logger.info({ platformPostId, metrics }, 'Instagram analytics fetched successfully');

      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platformPostId, error: errorMessage }, 'Failed to fetch Instagram analytics');
      return null;
    }
  }

  /**
   * Fetch basic media information
   */
  private async fetchMediaInfo(
    platformPostId: string,
    accessToken: string
  ): Promise<InstagramMediaResponse | null> {
    const fields = 'like_count,comments_count,media_type,media_product_type';
    const url = `${GRAPH_API_URL}/${platformPostId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = (await response.json()) as InstagramMediaResponse;
      logger.error(
        { status: response.status, error: errorData.error, platformPostId },
        'Instagram media API error'
      );
      return null;
    }

    return (await response.json()) as InstagramMediaResponse;
  }

  /**
   * Fetch insights with progressive fallback
   * Only falls back on metric rejection errors (400 with invalid parameter)
   * Treats auth/permission/rate-limit errors as hard failures
   */
  private async fetchInsightsWithFallback(
    platformPostId: string,
    accessToken: string
  ): Promise<
    | { success: true; data: InstagramInsightsResponse }
    | {
        success: false;
        isHardFailure: boolean;
        status: number;
        error?: InstagramInsightsResponse['error'];
      }
  > {
    for (const metrics of METRIC_SETS) {
      const result = await this.fetchInsights(platformPostId, accessToken, metrics);

      if (result.success) {
        logger.debug({ platformPostId, metrics }, 'Insights fetched successfully with metric set');
        return result;
      }

      // Check if this is a hard failure (auth/rate-limit) - don't try fallback
      if (result.isHardFailure) {
        logger.warn(
          { platformPostId, metrics, status: result.status },
          'Hard failure on insights fetch, not attempting fallback'
        );
        return result;
      }

      // Metric rejection - try next fallback
      logger.debug({ platformPostId, metrics }, 'Metric set rejected, trying next fallback');
    }

    // All metric sets rejected
    return { success: false, isHardFailure: false, status: 400 };
  }

  /**
   * Fetch insights for a media item with specific metrics
   * Returns structured result indicating success, metric rejection, or hard failure
   */
  private async fetchInsights(
    platformPostId: string,
    accessToken: string,
    metrics: string
  ): Promise<FetchInsightsResult> {
    const url = `${GRAPH_API_URL}/${platformPostId}/insights?metric=${metrics}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = (await response.json()) as InstagramInsightsResponse;
      const errorMessage = errorData.error?.message;

      // Determine if this is a hard failure or a metric rejection
      // Hard failures: auth errors, rate limits, or 400s that aren't metric-related
      const isHardFailure =
        HARD_FAILURE_CODES.includes(response.status) ||
        (response.status === 400 && !isMetricRejectionError(errorMessage));

      logger.debug(
        {
          status: response.status,
          error: errorData.error,
          platformPostId,
          metrics,
          isHardFailure,
        },
        isHardFailure ? 'Instagram insights hard failure' : 'Instagram insights metric rejection'
      );

      return {
        success: false,
        isHardFailure,
        status: response.status,
        error: errorData.error,
      };
    }

    const data = (await response.json()) as InstagramInsightsResponse;
    return { success: true, data };
  }
}
