/**
 * Social Planner - Ambassador Hooks
 *
 * TanStack Query hooks for ambassador system operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  type AmbassadorGroupSummary,
  type AmbassadorGroupDetail,
  type AmbassadorMemberSummary,
  type CreateAmbassadorGroupInput,
  type UpdateAmbassadorGroupInput,
  type SocialPlatform,
} from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

export interface AmbassadorStatus {
  isActive: boolean;
  groups: AmbassadorGroupSummary[];
}

export interface AmbassadorQueuePost {
  id: string;
  baseContent: string | null;
  media: Array<{
    id: string;
    url: string;
    type: string;
  }>;
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  channels: Array<{
    platform: SocialPlatform;
    accountName: string;
  }>;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  hasShared: boolean;
}

export interface AmbassadorShareSummary {
  id: string;
  postId: string;
  platform: SocialPlatform;
  sharedAt: string;
  shareUrl: string | null;
}

export interface AmbassadorStats {
  totalShares: number;
  thisMonthShares: number;
  postsShared: number;
}

export interface PendingInvitation {
  membership: AmbassadorMemberSummary;
  group: AmbassadorGroupSummary;
}

export interface PostShareStats {
  totalShares: number;
  uniqueAmbassadors: number;
  byPlatform: Record<string, number>;
}

export interface BulkInviteResult {
  success: AmbassadorMemberSummary[];
  failed: Array<{ email: string; reason: string }>;
}

// ============================================
// QUERY KEYS
// ============================================

export const ambassadorKeys = {
  all: ['ambassador'] as const,
  groups: () => [...ambassadorKeys.all, 'groups'] as const,
  group: (id: string) => [...ambassadorKeys.all, 'group', id] as const,
  status: () => [...ambassadorKeys.all, 'status'] as const,
  invitations: () => [...ambassadorKeys.all, 'invitations'] as const,
  queue: () => [...ambassadorKeys.all, 'queue'] as const,
  shares: () => [...ambassadorKeys.all, 'shares'] as const,
  stats: () => [...ambassadorKeys.all, 'stats'] as const,
  postShares: (postId: string) => [...ambassadorKeys.all, 'post-shares', postId] as const,
};

// ============================================
// ADMIN: GROUP MANAGEMENT
// ============================================

/**
 * Get all ambassador groups (admin)
 */
export function useAmbassadorGroups() {
  return useQuery({
    queryKey: ambassadorKeys.groups(),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorGroupSummary[]>('/ambassador-groups');
      return data;
    },
  });
}

/**
 * Get a single group with members (admin)
 */
export function useAmbassadorGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ambassadorKeys.group(groupId!),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorGroupDetail>(`/ambassador-groups/${groupId}`);
      return data;
    },
    enabled: !!groupId,
  });
}

/**
 * Create ambassador group
 */
export function useCreateAmbassadorGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAmbassadorGroupInput) => {
      const { data } = await api.post<AmbassadorGroupSummary>('/ambassador-groups', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.groups() });
      toast.success('Ambassador group created');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Update ambassador group
 */
export function useUpdateAmbassadorGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAmbassadorGroupInput) => {
      const { data } = await api.patch<AmbassadorGroupSummary>(
        `/ambassador-groups/${groupId}`,
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.groups() });
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.group(groupId) });
      toast.success('Group updated');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Send a test email for an ambassador group's template
 */
export function useSendTestEmail(groupId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/ambassador-groups/${groupId}/test-email`);
      return data;
    },
    onSuccess: () => {
      toast.success('Test email sent — check your inbox');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Delete ambassador group
 */
export function useDeleteAmbassadorGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await api.delete(`/ambassador-groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.groups() });
      toast.success('Group deleted');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

// ============================================
// ADMIN: MEMBER MANAGEMENT
// ============================================

/**
 * Invite a member to a group
 */
export function useInviteAmbassador(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<AmbassadorMemberSummary>(
        `/ambassador-groups/${groupId}/members`,
        { email }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.group(groupId) });
      toast.success('Invitation sent');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Bulk invite members to a group
 */
export function useBulkInviteAmbassadors(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emails: string[]) => {
      const { data } = await api.post<BulkInviteResult>(
        `/ambassador-groups/${groupId}/members/bulk`,
        { emails }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.group(groupId) });
      const successCount = data.success.length;
      const failCount = data.failed.length;
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} invitation${successCount > 1 ? 's' : ''} sent`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`${successCount} sent, ${failCount} failed`);
      } else {
        toast.error('All invitations failed');
      }
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

/**
 * Remove a member from a group
 */
export function useRemoveAmbassador(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/ambassador-groups/${groupId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.group(groupId) });
      toast.success('Member removed');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

// ============================================
// USER: AMBASSADOR STATUS
// ============================================

/**
 * Get current user's ambassador status
 */
export function useAmbassadorStatus() {
  return useQuery({
    queryKey: ambassadorKeys.status(),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorStatus>('/ambassador/status');
      return data;
    },
  });
}

/**
 * Get pending invitations for current user
 */
export function usePendingInvitations() {
  return useQuery({
    queryKey: ambassadorKeys.invitations(),
    queryFn: async () => {
      const { data } = await api.get<PendingInvitation[]>('/ambassador/invitations');
      return data;
    },
  });
}

/**
 * Respond to an invitation
 */
export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, accept }: { membershipId: string; accept: boolean }) => {
      const { data } = await api.post<AmbassadorMemberSummary>(
        `/ambassador/invitations/${membershipId}/respond`,
        { accept }
      );
      return data;
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.status() });
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

// ============================================
// USER: AMBASSADOR QUEUE & SHARES
// ============================================

/**
 * Get posts available for sharing
 */
export function useAmbassadorQueue() {
  return useQuery({
    queryKey: ambassadorKeys.queue(),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorQueuePost[]>('/ambassador/queue');
      return data;
    },
  });
}

/**
 * Get ambassador's share history
 */
export function useAmbassadorShares() {
  return useQuery({
    queryKey: ambassadorKeys.shares(),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorShareSummary[]>('/ambassador/shares');
      return data;
    },
  });
}

/**
 * Get ambassador's stats
 */
export function useAmbassadorStats() {
  return useQuery({
    queryKey: ambassadorKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<AmbassadorStats>('/ambassador/stats');
      return data;
    },
  });
}

/**
 * Record a share
 */
export function useRecordShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string; platform: SocialPlatform; shareUrl?: string }) => {
      const { data } = await api.post<AmbassadorShareSummary>('/ambassador/shares', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.queue() });
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.shares() });
      queryClient.invalidateQueries({ queryKey: ambassadorKeys.stats() });
      toast.success('Share recorded');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

// ============================================
// POST SHARE STATS
// ============================================

/**
 * Get share stats for a post
 */
export function usePostShareStats(postId: string | undefined) {
  return useQuery({
    queryKey: ambassadorKeys.postShares(postId!),
    queryFn: async () => {
      const { data } = await api.get<PostShareStats>(`/posts/${postId}/shares`);
      return data;
    },
    enabled: !!postId,
  });
}
