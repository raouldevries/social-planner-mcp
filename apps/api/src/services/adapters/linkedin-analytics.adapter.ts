/**
 * LinkedIn Analytics Adapter
 *
 * Fetches post analytics using LinkedIn Marketing API.
 *
 * API Documentation:
 * - Share Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-statistics
 * - Organization Share Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/organization-share-statistics
 *
 * Required Scopes:
 * - r_organization_social (for organization posts)
 * - rw_organization_admin (for organization analytics)
 * - r_member_postAnalytics (for personal posts)
 */

import { logger } from '../../lib/logger';
import type { AnalyticsMetrics, PlatformAnalyticsAdapter } from '../analytics-sync.service';

// ============================================
// CONSTANTS
// ============================================

const LINKEDIN_API_URL = 'https://api.linkedin.com/rest';
const LINKEDIN_VERSION = '202601';

// ============================================
// TYPES
// ============================================

interface LinkedInShareStatistics {
  uniqueImpressionsCount: number;
  shareCount: number;
  likeCount: number;
  commentCount: number;
  clickCount: number;
  engagement: number;
  impressionCount: number;
}

interface LinkedInShareStatistic {
  totalShareStatistics: LinkedInShareStatistics;
  share?: string;
  ugcPost?: string;
}

interface LinkedInShareStatisticsResponse {
  elements: LinkedInShareStatistic[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build common headers for LinkedIn API requests
 */
function buildHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LINKEDIN_VERSION,
  };
}

/**
 * Map LinkedIn statistics to standard AnalyticsMetrics
 */
function mapToMetrics(stats: LinkedInShareStatistics): AnalyticsMetrics {
  return {
    impressions: stats.impressionCount || 0,
    reach: stats.uniqueImpressionsCount || 0,
    engagements:
      (stats.likeCount || 0) +
      (stats.commentCount || 0) +
      (stats.shareCount || 0) +
      (stats.clickCount || 0),
    likes: stats.likeCount || 0,
    comments: stats.commentCount || 0,
    shares: stats.shareCount || 0,
    saves: 0, // LinkedIn doesn't have a saves metric
    clicks: stats.clickCount || 0,
  };
}

// ============================================
// ADAPTER CLASS
// ============================================

export class LinkedInAnalyticsAdapter implements PlatformAnalyticsAdapter {
  /**
   * Fetch analytics for a LinkedIn post
   *
   * @param platformPostId - The LinkedIn post URN (e.g., "urn:li:share:123456" or "urn:li:ugcPost:123456")
   * @param accessToken - OAuth access token
   * @param platformAccountId - Organization URN (e.g., "urn:li:organization:123456") or person URN
   */
  async fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    platformAccountId: string
  ): Promise<AnalyticsMetrics | null> {
    try {
      logger.debug({ platformPostId, platformAccountId }, 'Fetching LinkedIn analytics');

      const isOrganizationPost = platformAccountId.includes('organization');
      const response = isOrganizationPost
        ? await this.fetchOrganizationAnalytics(platformPostId, accessToken, platformAccountId)
        : await this.fetchPersonalAnalytics(platformPostId, accessToken);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          { status: response.status, error: errorText, platformPostId },
          'LinkedIn analytics API error'
        );
        return null;
      }

      const data = (await response.json()) as LinkedInShareStatisticsResponse;

      if (!data.elements || data.elements.length === 0) {
        logger.warn({ platformPostId }, 'No analytics data returned from LinkedIn');
        return null;
      }

      const stats = data.elements[0].totalShareStatistics;
      const metrics = mapToMetrics(stats);

      logger.info({ platformPostId, metrics }, 'LinkedIn analytics fetched successfully');

      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platformPostId, error: errorMessage }, 'Failed to fetch LinkedIn analytics');
      return null;
    }
  }

  /**
   * Fetch analytics for an organization post.
   * Uses: GET /organizationalEntityShareStatistics
   *
   * URL is built manually because URLSearchParams percent-encodes the parentheses
   * in LinkedIn's REST.li List(...) syntax, which the API rejects. URN colons must
   * still be percent-encoded, but the List( and ) wrapping must stay literal.
   * Separate parameters are required per URN type: ugcPosts= for ugcPost URNs,
   * shares= for legacy share URNs.
   */
  private async fetchOrganizationAnalytics(
    platformPostId: string,
    accessToken: string,
    organizationUrn: string
  ): Promise<Response> {
    const paramName = platformPostId.startsWith('urn:li:ugcPost:') ? 'ugcPosts' : 'shares';
    const url =
      `${LINKEDIN_API_URL}/organizationalEntityShareStatistics` +
      `?q=organizationalEntity` +
      `&organizationalEntity=${encodeURIComponent(organizationUrn)}` +
      `&${paramName}=List(${encodeURIComponent(platformPostId)})`;

    return fetch(url, { headers: buildHeaders(accessToken) });
  }

  /**
   * Fetch analytics for a personal post
   * Uses: GET /shareStatistics
   */
  private async fetchPersonalAnalytics(
    platformPostId: string,
    accessToken: string
  ): Promise<Response> {
    const paramName = platformPostId.startsWith('urn:li:ugcPost:') ? 'ugcPosts' : 'shares';
    const url =
      `${LINKEDIN_API_URL}/shareStatistics` +
      `?q=${paramName === 'ugcPosts' ? 'ugcPosts' : 'shares'}` +
      `&${paramName}=List(${encodeURIComponent(platformPostId)})`;

    return fetch(url, { headers: buildHeaders(accessToken) });
  }
}
