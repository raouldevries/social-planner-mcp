/**
 * Social Accounts Hooks
 *
 * TanStack Query hooks for social account management (Instagram, LinkedIn).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

export type SocialPlatform = 'INSTAGRAM' | 'LINKEDIN';

export interface SocialAccountSummary {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountType: string | null;
  profileImageUrl: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
}

export interface SocialAccountDetail extends SocialAccountSummary {
  connectedBy: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  connectedAt: string;
}

export interface SocialAccountsResponse {
  data: SocialAccountSummary[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SocialAccountFilters {
  platform?: SocialPlatform;
  page?: number;
  perPage?: number;
}

// LinkedIn OAuth result with organizations
export interface LinkedInOrganization {
  organizationUrn: string;
  organizationId: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

export interface LinkedInOAuthResult {
  accessToken: string;
  expiresIn: number;
  userProfile: {
    sub: string;
    name: string;
    picture?: string;
  };
  organizations: LinkedInOrganization[];
}

// ============================================
// QUERY KEYS
// ============================================

export const socialAccountsKeys = {
  all: ['socialAccounts'] as const,
  list: (filters: SocialAccountFilters) => [...socialAccountsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...socialAccountsKeys.all, 'detail', id] as const,
};

// ============================================
// LIST HOOKS
// ============================================

/**
 * Fetch list of connected social accounts
 */
export function useSocialAccounts(filters: SocialAccountFilters = {}) {
  return useQuery({
    queryKey: socialAccountsKeys.list(filters),
    queryFn: async (): Promise<SocialAccountsResponse> => {
      const params = new URLSearchParams();
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const response = await api.get(`/social-accounts?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single social account by ID
 */
export function useSocialAccount(id: string | undefined) {
  return useQuery({
    queryKey: socialAccountsKeys.detail(id ?? ''),
    queryFn: async (): Promise<SocialAccountDetail> => {
      const response = await api.get(`/social-accounts/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// OAUTH HOOKS
// ============================================

/**
 * Handle OAuth callback for Instagram - exchange code for account
 */
export function useConnectInstagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<SocialAccountDetail> => {
      const response = await api.post('/social-accounts/oauth/instagram/callback', { code });
      return response.data;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: socialAccountsKeys.all });
      toast.success(`${account.accountName} connected successfully`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to connect Instagram account';
      toast.error(message);
    },
  });
}

/**
 * Handle LinkedIn OAuth callback - returns token and organizations
 */
export function useLinkedInCallback() {
  return useMutation({
    mutationFn: async (code: string): Promise<LinkedInOAuthResult> => {
      const response = await api.post('/social-accounts/oauth/linkedin/callback', { code });
      return response.data;
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to connect LinkedIn';
      toast.error(message);
    },
  });
}

/**
 * Complete LinkedIn connection with selected organization or personal profile
 */
export function useCompleteLinkedInConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accessToken,
      expiresIn,
      organization,
      userProfile,
    }: {
      accessToken: string;
      expiresIn: number;
      organization?: LinkedInOrganization;
      userProfile?: { sub: string; name: string; picture?: string };
    }): Promise<SocialAccountDetail> => {
      const response = await api.post('/social-accounts/oauth/linkedin/complete', {
        accessToken,
        expiresIn,
        organizationUrn: organization?.organizationUrn,
        organizationName: organization?.name,
        organizationLogoUrl: organization?.logoUrl || '',
        personalProfileId: userProfile?.sub,
        personalProfileName: userProfile?.name,
        personalProfilePicture: userProfile?.picture,
      });
      return response.data;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: socialAccountsKeys.all });
      toast.success(`${account.accountName} connected successfully`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to complete LinkedIn connection';
      toast.error(message);
    },
  });
}

/**
 * @deprecated Use useConnectInstagram or useLinkedInCallback instead
 * Handle OAuth callback - exchange code for account
 */
export function useConnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      code,
    }: {
      platform: SocialPlatform;
      code: string;
    }): Promise<SocialAccountDetail> => {
      const response = await api.post(`/social-accounts/oauth/${platform.toLowerCase()}/callback`, {
        code,
      });
      return response.data;
    },
    onSuccess: (account) => {
      // Invalidate social accounts list
      queryClient.invalidateQueries({ queryKey: socialAccountsKeys.all });
      toast.success(`${account.accountName} connected successfully`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to connect account';
      toast.error(message);
    },
  });
}

// ============================================
// DISCONNECT HOOK
// ============================================

/**
 * Disconnect a social account
 */
export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string): Promise<void> => {
      await api.delete(`/social-accounts/${accountId}`);
    },
    onSuccess: () => {
      // Invalidate social accounts list
      queryClient.invalidateQueries({ queryKey: socialAccountsKeys.all });
      toast.success('Account disconnected successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to disconnect account';
      toast.error(message);
    },
  });
}

// ============================================
// REFRESH TOKEN HOOK
// ============================================

/**
 * Refresh token for Instagram account
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string): Promise<void> => {
      await api.post(`/social-accounts/${accountId}/refresh`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialAccountsKeys.all });
      toast.success('Token refreshed successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to refresh token';
      toast.error(message);
    },
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: SocialPlatform): string {
  switch (platform) {
    case 'INSTAGRAM':
      return 'Instagram';
    case 'LINKEDIN':
      return 'LinkedIn';
    default:
      return platform;
  }
}

/**
 * Get platform color
 */
export function getPlatformColor(platform: SocialPlatform): string {
  switch (platform) {
    case 'INSTAGRAM':
      return '#E4405F';
    case 'LINKEDIN':
      return '#0A66C2';
    default:
      return '#6B7280';
  }
}
