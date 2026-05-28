/**
 * Social Planner - Social Account Service
 *
 * Handles social media account connections (Instagram, LinkedIn).
 * Manages OAuth flows and token storage.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@social-planner/database';
import { config } from '../config';
import type {
  SocialAccountSummary,
  SocialAccountDetail,
  PaginatedResponse,
  UserSummary,
} from '@social-planner/shared';

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

const socialAccountSummarySelect = {
  id: true,
  platform: true,
  accountName: true,
  accountType: true,
  profileImageUrl: true,
  lastSyncAt: true,
  tokenExpiresAt: true,
};

const socialAccountDetailSelect = {
  ...socialAccountSummarySelect,
  connectedAt: true,
  connectedBy: {
    select: userSummarySelect,
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

function formatSocialAccountSummary(account: any): SocialAccountSummary {
  return {
    id: account.id,
    platform: account.platform,
    accountName: account.accountName,
    accountType: account.accountType,
    profileImageUrl: account.profileImageUrl,
    lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
  };
}

function formatSocialAccountDetail(account: any): SocialAccountDetail {
  return {
    ...formatSocialAccountSummary(account),
    connectedBy: formatUserSummary(account.connectedBy),
    connectedAt: account.connectedAt.toISOString(),
  };
}

// ============================================
// SOCIAL ACCOUNT CRUD
// ============================================

export interface SocialAccountFilters {
  platform?: 'INSTAGRAM' | 'LINKEDIN';
}

export async function getSocialAccounts(
  filters: SocialAccountFilters,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<SocialAccountSummary>> {
  const where: Prisma.SocialAccountWhereInput = {};

  if (filters.platform) {
    where.platform = filters.platform;
  }

  const [accounts, total] = await Promise.all([
    prisma.socialAccount.findMany({
      where,
      select: socialAccountSummarySelect,
      orderBy: { connectedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.socialAccount.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: accounts.map(formatSocialAccountSummary),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export async function getSocialAccountById(accountId: string): Promise<SocialAccountDetail> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
    select: socialAccountDetailSelect,
  });

  if (!account) {
    throw new AppError('SOCIAL_ACCOUNT_NOT_FOUND', 'Social account not found', 404);
  }

  return formatSocialAccountDetail(account);
}

export async function deleteSocialAccount(accountId: string, _userId: string): Promise<void> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      _count: { select: { channels: true } },
    },
  });

  if (!account) {
    throw new AppError('SOCIAL_ACCOUNT_NOT_FOUND', 'Social account not found', 404);
  }

  // Check if account has pending or scheduled posts
  const pendingPosts = await prisma.postChannel.count({
    where: {
      socialAccountId: accountId,
      status: 'PENDING',
    },
  });

  if (pendingPosts > 0) {
    throw new AppError(
      'ACCOUNT_HAS_PENDING_POSTS',
      `Cannot disconnect account with ${pendingPosts} pending post(s)`,
      400
    );
  }

  await prisma.socialAccount.delete({ where: { id: accountId } });
}

// ============================================
// OAUTH FLOWS
// ============================================

// Instagram OAuth URLs (via Facebook Login for Instagram Graph API - required for posting)
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v21.0';

// LinkedIn OAuth URLs
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
// Use /v2/me for profile (doesn't require OpenID Connect product)
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/me';

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookPageResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
      id: string;
    };
  }>;
}

interface InstagramAccountResponse {
  id: string;
  username: string;
  profile_picture_url?: string;
  account_type?: string;
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
}

// LinkedIn /v2/me profile response
interface LinkedInProfileResponse {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  firstName?: {
    localized?: Record<string, string>;
    preferredLocale?: { country: string; language: string };
  };
  lastName?: {
    localized?: Record<string, string>;
    preferredLocale?: { country: string; language: string };
  };
  profilePicture?: {
    displayImage?: string;
    'displayImage~'?: { elements?: Array<{ identifiers?: Array<{ identifier?: string }> }> };
  };
}

export interface LinkedInOrganizationOption {
  organizationUrn: string;
  organizationId: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

/**
 * Get Instagram OAuth URL (via Facebook Login)
 * Uses Facebook OAuth to get access to Instagram Graph API for posting
 */
export function getInstagramAuthUrl(): string {
  if (!config.INSTAGRAM_APP_ID) {
    throw new AppError('NOT_CONFIGURED', 'Instagram OAuth is not configured', 501);
  }

  // Scopes needed for Instagram posting via Facebook Login:
  // - instagram_basic: Basic Instagram account info
  // - instagram_content_publish: Publishing content to Instagram
  // - pages_show_list: List Facebook Pages (needed to find linked Instagram account)
  // - pages_read_engagement: Read Page engagement data
  // - business_management: Access business assets (required for Facebook Login for Business)
  const params = new URLSearchParams({
    client_id: config.INSTAGRAM_APP_ID,
    redirect_uri: config.INSTAGRAM_REDIRECT_URI || '',
    scope:
      'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
    response_type: 'code',
  });

  return `${FACEBOOK_AUTH_URL}?${params}`;
}

/**
 * Handle Instagram OAuth callback (via Facebook Login)
 * This exchanges the Facebook OAuth code for an access token, then finds
 * the linked Instagram Business Account through Facebook Pages.
 */
export async function handleInstagramCallback(
  code: string,
  userId: string
): Promise<SocialAccountDetail> {
  if (!config.INSTAGRAM_APP_ID || !config.INSTAGRAM_APP_SECRET) {
    throw new AppError('NOT_CONFIGURED', 'Instagram OAuth is not configured', 501);
  }

  // Step 1: Exchange code for Facebook access token
  const tokenParams = new URLSearchParams({
    client_id: config.INSTAGRAM_APP_ID,
    client_secret: config.INSTAGRAM_APP_SECRET,
    redirect_uri: config.INSTAGRAM_REDIRECT_URI || '',
    code,
  });

  const tokenResponse = await fetch(`${FACEBOOK_TOKEN_URL}?${tokenParams}`);

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error('Facebook token exchange failed:', errorBody);
    throw new AppError('OAUTH_FAILED', 'Failed to exchange code for token', 400);
  }

  const tokens = (await tokenResponse.json()) as FacebookTokenResponse;

  // Step 2: Get Facebook Pages with Instagram Business Accounts
  const pagesResponse = await fetch(
    `${FACEBOOK_GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tokens.access_token}`
  );

  if (!pagesResponse.ok) {
    const errorBody = await pagesResponse.text();
    console.error('Failed to get Facebook Pages:', errorBody);
    throw new AppError('OAUTH_FAILED', 'Failed to get Facebook Pages', 400);
  }

  const pagesData = (await pagesResponse.json()) as FacebookPageResponse;

  // Debug: Log all pages returned
  console.log('Facebook Pages returned:', JSON.stringify(pagesData, null, 2));

  // Find pages with linked Instagram accounts
  const pagesWithInstagram = pagesData.data.filter((page) => page.instagram_business_account);

  console.log('Pages with Instagram Business Account:', pagesWithInstagram.length);

  if (pagesWithInstagram.length === 0) {
    // Provide more helpful error message
    const pageCount = pagesData.data?.length ?? 0;
    const pageNames = pagesData.data?.map((p) => p.name).join(', ') || 'none';
    console.error(
      `No Instagram Business Account found. User has ${pageCount} Facebook Pages: ${pageNames}`
    );

    throw new AppError(
      'NO_INSTAGRAM_ACCOUNT',
      pageCount === 0
        ? 'No Facebook Pages found. Please ensure you have admin access to a Facebook Page with a linked Instagram Business account.'
        : `Found ${pageCount} Facebook Page(s) (${pageNames}) but none have a linked Instagram Business account. Please connect your Instagram Business/Creator account to one of your Facebook Pages.`,
      400
    );
  }

  // Use the first page with Instagram (in the future, we could let user choose)
  const page = pagesWithInstagram[0];
  const instagramAccountId = page.instagram_business_account!.id;
  const pageAccessToken = page.access_token;

  // Step 3: Get Instagram account details
  // Note: account_type is not available on IGUser, only on basic display API
  const igAccountResponse = await fetch(
    `${FACEBOOK_GRAPH_URL}/${instagramAccountId}?fields=id,username,profile_picture_url&access_token=${pageAccessToken}`
  );

  if (!igAccountResponse.ok) {
    const errorBody = await igAccountResponse.text();
    console.error('Failed to get Instagram account details:', errorBody);
    throw new AppError('OAUTH_FAILED', 'Failed to get Instagram account details', 400);
  }

  const igAccount = (await igAccountResponse.json()) as InstagramAccountResponse;

  // Step 4: Check if account already connected
  const existing = await prisma.socialAccount.findUnique({
    where: {
      platform_platformAccountId: {
        platform: 'INSTAGRAM',
        platformAccountId: igAccount.id,
      },
    },
  });

  if (existing) {
    // Update existing account with new token
    const updated = await prisma.socialAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: pageAccessToken,
        accountName: igAccount.username,
        accountType: igAccount.account_type ?? 'BUSINESS',
        profileImageUrl: igAccount.profile_picture_url ?? null,
        lastSyncAt: new Date(),
      },
      select: socialAccountDetailSelect,
    });

    return formatSocialAccountDetail(updated);
  }

  // Step 5: Create new account
  const account = await prisma.socialAccount.create({
    data: {
      platform: 'INSTAGRAM',
      platformAccountId: igAccount.id,
      accountName: igAccount.username,
      accountType: igAccount.account_type ?? 'BUSINESS',
      profileImageUrl: igAccount.profile_picture_url ?? null,
      accessToken: pageAccessToken,
      connectedById: userId,
    },
    select: socialAccountDetailSelect,
  });

  return formatSocialAccountDetail(account);
}

/**
 * Get LinkedIn OAuth URL
 */
export function getLinkedInAuthUrl(): string {
  if (!config.LINKEDIN_CLIENT_ID) {
    throw new AppError('NOT_CONFIGURED', 'LinkedIn OAuth is not configured', 501);
  }

  const params = new URLSearchParams({
    client_id: config.LINKEDIN_CLIENT_ID,
    redirect_uri: config.LINKEDIN_REDIRECT_URI || '',
    // Community Management API scopes
    // See: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
    // rw_organization_admin needed to list organizations user can post to
    scope: 'w_member_social w_organization_social r_organization_social rw_organization_admin',
    response_type: 'code',
  });

  return `${LINKEDIN_AUTH_URL}?${params}`;
}

export interface LinkedInOAuthResult {
  accessToken: string;
  expiresIn: number;
  userProfile: {
    sub: string;
    name: string;
    picture?: string;
  };
  organizations: LinkedInOrganizationOption[];
}

/**
 * Handle LinkedIn OAuth callback - returns token and user profile
 * Now includes organization fetching via Community Management API
 */
export async function handleLinkedInCallback(
  code: string,
  _userId: string
): Promise<LinkedInOAuthResult> {
  if (!config.LINKEDIN_CLIENT_ID || !config.LINKEDIN_CLIENT_SECRET) {
    throw new AppError('NOT_CONFIGURED', 'LinkedIn OAuth is not configured', 501);
  }

  // Exchange code for access token
  const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.LINKEDIN_REDIRECT_URI || '',
      client_id: config.LINKEDIN_CLIENT_ID,
      client_secret: config.LINKEDIN_CLIENT_SECRET,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error('LinkedIn token exchange failed:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      body: errorBody,
      redirect_uri: config.LINKEDIN_REDIRECT_URI,
    });
    throw new AppError(
      'OAUTH_FAILED',
      `Failed to exchange LinkedIn code for token: ${errorBody}`,
      400
    );
  }

  const tokens = (await tokenResponse.json()) as LinkedInTokenResponse;

  // Use token introspection to get member URN (doesn't require profile scopes)
  const introspectResponse = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: tokens.access_token,
      client_id: config.LINKEDIN_CLIENT_ID!,
      client_secret: config.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  let memberId = `member_${Date.now()}`; // Fallback ID
  let memberName = 'LinkedIn User';

  if (introspectResponse.ok) {
    const introspectData = (await introspectResponse.json()) as {
      active: boolean;
      sub?: string;
      name?: string;
    };
    console.log('LinkedIn token introspection:', JSON.stringify(introspectData, null, 2));
    if (introspectData.sub) {
      memberId = introspectData.sub;
    }
    if (introspectData.name) {
      memberName = introspectData.name;
    }
  } else {
    console.log('Token introspection failed, using fallback ID');
  }

  // Try to get profile if possible (may fail without profile scopes)
  let profilePictureUrl: string | undefined;
  try {
    const profileResponse = await fetch(
      `${LINKEDIN_PROFILE_URL}?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as LinkedInProfileResponse;
      memberId = profile.id || memberId;
      const firstName = profile.localizedFirstName || '';
      const lastName = profile.localizedLastName || '';
      if (firstName || lastName) {
        memberName = `${firstName} ${lastName}`.trim();
      }
      const pictureElements = profile.profilePicture?.['displayImage~']?.elements;
      profilePictureUrl =
        pictureElements?.[pictureElements.length - 1]?.identifiers?.[0]?.identifier;
    }
  } catch (error) {
    console.log('Profile fetch failed (expected without profile scopes):', error);
  }

  // Fetch organizations the user can post to (Community Management API)
  // See: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control
  const organizations: LinkedInOrganizationOption[] = [];
  try {
    // First get organization ACLs without projection
    const orgsResponse = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (orgsResponse.ok) {
      const orgsData = (await orgsResponse.json()) as { elements?: Array<Record<string, unknown>> };
      console.log('LinkedIn organizations response:', JSON.stringify(orgsData, null, 2));

      if (orgsData.elements && Array.isArray(orgsData.elements)) {
        for (const element of orgsData.elements) {
          const orgUrn = element.organization as string | undefined;
          if (orgUrn) {
            const orgId = orgUrn.split(':').pop() || '';

            // Try to fetch organization details with logo
            try {
              const orgDetailResponse = await fetch(
                `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`,
                {
                  headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                  },
                }
              );

              if (orgDetailResponse.ok) {
                const orgDetail = (await orgDetailResponse.json()) as Record<string, unknown>;
                const localizedName = orgDetail.localizedName as string | undefined;
                const vanityName = orgDetail.vanityName as string | undefined;

                // Extract logo URL from logoV2 field
                // LinkedIn returns logos in different sizes, we take the largest one
                let logoUrl: string | undefined;
                const logoV2 = orgDetail.logoV2 as
                  | {
                      'original~'?: {
                        elements?: Array<{ identifiers?: Array<{ identifier?: string }> }>;
                      };
                    }
                  | undefined;
                const logoElements = logoV2?.['original~']?.elements;
                if (logoElements && logoElements.length > 0) {
                  logoUrl = logoElements[logoElements.length - 1]?.identifiers?.[0]?.identifier;
                }

                organizations.push({
                  organizationUrn: orgUrn,
                  organizationId: orgId,
                  name: localizedName || `Organization ${orgId}`,
                  ...(vanityName && { vanityName }),
                  ...(logoUrl && { logoUrl }),
                });
              } else {
                // Add org with minimal info if detail fetch fails
                organizations.push({
                  organizationUrn: orgUrn,
                  organizationId: orgId,
                  name: `Organization ${orgId}`,
                });
              }
            } catch (detailError) {
              console.log('Failed to fetch org details:', detailError);
              organizations.push({
                organizationUrn: orgUrn,
                organizationId: orgId,
                name: `Organization ${orgId}`,
              });
            }
          }
        }
      }
    } else {
      const errorBody = await orgsResponse.text();
      console.log('LinkedIn organizations fetch failed (may not have org access):', {
        status: orgsResponse.status,
        body: errorBody,
      });
    }
  } catch (error) {
    console.log('Error fetching LinkedIn organizations:', error);
    // Continue without organizations - user can still connect personal profile
  }

  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    userProfile: {
      sub: memberId,
      name: memberName,
      ...(profilePictureUrl && { picture: profilePictureUrl }),
    },
    organizations,
  };
}

/**
 * Complete LinkedIn connection with selected organization or personal profile
 */
export async function completeLinkedInConnection(
  accessToken: string,
  expiresIn: number,
  userId: string,
  organizationUrn?: string,
  organizationName?: string,
  organizationLogoUrl?: string,
  personalProfileId?: string,
  personalProfileName?: string,
  personalProfilePicture?: string
): Promise<SocialAccountDetail> {
  // Calculate token expiry
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  // Determine account details based on organization or personal
  const isOrganization = !!organizationUrn;
  const platformAccountId = isOrganization
    ? organizationUrn
    : personalProfileId || `member_${Date.now()}`;
  const accountName = isOrganization
    ? organizationName || 'LinkedIn Organization'
    : personalProfileName || 'LinkedIn User';
  const profileImageUrl = isOrganization ? organizationLogoUrl : personalProfilePicture;
  const accountType = isOrganization ? 'ORGANIZATION' : 'PERSONAL';

  // Check if account already connected
  const existing = await prisma.socialAccount.findUnique({
    where: {
      platform_platformAccountId: {
        platform: 'LINKEDIN',
        platformAccountId,
      },
    },
  });

  if (existing) {
    // Update existing account
    const updated = await prisma.socialAccount.update({
      where: { id: existing.id },
      data: {
        accessToken,
        tokenExpiresAt,
        accountName,
        profileImageUrl: profileImageUrl ?? null,
        accountType,
        lastSyncAt: new Date(),
      },
      select: socialAccountDetailSelect,
    });

    return formatSocialAccountDetail(updated);
  }

  // Create new account
  const account = await prisma.socialAccount.create({
    data: {
      platform: 'LINKEDIN',
      platformAccountId,
      accountName,
      accountType,
      profileImageUrl: profileImageUrl ?? null,
      accessToken,
      tokenExpiresAt,
      connectedById: userId,
    },
    select: socialAccountDetailSelect,
  });

  return formatSocialAccountDetail(account);
}

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Refresh Instagram/Facebook Page token
 * Facebook Page tokens can be exchanged for long-lived tokens (60 days)
 */
export async function refreshInstagramToken(accountId: string): Promise<void> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
    select: { accessToken: true, platform: true, platformAccountId: true },
  });

  if (!account) {
    throw new AppError('SOCIAL_ACCOUNT_NOT_FOUND', 'Social account not found', 404);
  }

  if (account.platform !== 'INSTAGRAM') {
    throw new AppError('INVALID_PLATFORM', 'Can only refresh Instagram tokens', 400);
  }

  if (!config.INSTAGRAM_APP_ID || !config.INSTAGRAM_APP_SECRET) {
    throw new AppError('NOT_CONFIGURED', 'Instagram OAuth is not configured', 501);
  }

  // Exchange for long-lived token via Facebook Graph API
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.INSTAGRAM_APP_ID,
    client_secret: config.INSTAGRAM_APP_SECRET,
    fb_exchange_token: account.accessToken,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to refresh token:', errorBody);
    throw new AppError('TOKEN_REFRESH_FAILED', 'Failed to refresh Instagram token', 400);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number };

  // Also refresh profile image URL (CDN URLs expire over time)
  let profileImageUrl: string | null = null;
  try {
    const igResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${account.platformAccountId}?fields=id,username,profile_picture_url&access_token=${data.access_token}`
    );
    if (igResponse.ok) {
      const igData = (await igResponse.json()) as InstagramAccountResponse;
      profileImageUrl = igData.profile_picture_url ?? null;
    }
  } catch {
    // Non-critical: continue with token update even if image refresh fails
  }

  await prisma.socialAccount.update({
    where: { id: accountId },
    data: {
      accessToken: data.access_token,
      tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      lastSyncAt: new Date(),
      ...(profileImageUrl && { profileImageUrl }),
    },
  });
}

/**
 * Check if token needs refresh (within 7 days of expiry)
 */
export async function getAccountsNeedingRefresh(): Promise<string[]> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accounts = await prisma.socialAccount.findMany({
    where: {
      tokenExpiresAt: {
        lte: sevenDaysFromNow,
        not: null,
      },
    },
    select: { id: true },
  });

  return accounts.map((a) => a.id);
}
