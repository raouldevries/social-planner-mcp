/**
 * Social Planner - Invitation Hooks
 *
 * Custom hooks for invitation operations (accept invite flow).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import toast from 'react-hot-toast';
import type {
  InvitationValidationResult,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  CreateInvitationRequest,
  InvitationSummary,
  ListInvitationsParams,
  ListInvitationsResponse,
} from '@social-planner/shared';

// Query keys
export const invitationKeys = {
  all: ['invitations'] as const,
  list: (params?: ListInvitationsParams) => [...invitationKeys.all, 'list', params] as const,
  validate: (token: string) => [...invitationKeys.all, 'validate', token] as const,
};

/**
 * Hook to validate an invitation token
 */
export function useValidateInvitation(token: string) {
  return useQuery({
    queryKey: invitationKeys.validate(token),
    queryFn: async () => {
      const { data } = await api.get<InvitationValidationResult>(`/invitations/validate/${token}`);
      return data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to accept an invitation
 */
export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: AcceptInvitationRequest) => {
      const { data: response } = await api.post<AcceptInvitationResponse>(
        `/invitations/${token}/accept`,
        data
      );
      return response;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      setUser(data.user as User);
      queryClient.invalidateQueries();
      toast.success('Welcome to Social Planner!');
      navigate('/');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

// ============================================================================
// Admin Hooks
// ============================================================================

/**
 * Hook to list invitations (admin only)
 */
export function useInvitations(params?: ListInvitationsParams) {
  return useQuery({
    queryKey: invitationKeys.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.email) queryParams.set('email', params.email);
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const { data } = await api.get<ListInvitationsResponse>(
        `/invitations?${queryParams.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new invitation (admin only)
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvitationRequest) => {
      const { data: response } = await api.post<InvitationSummary>('/invitations', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      toast.success('Invitation sent successfully');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to revoke a pending invitation (admin only)
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      toast.success('Invitation revoked');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to resend an invitation email (admin only)
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data } = await api.post<InvitationSummary>(`/invitations/${invitationId}/resend`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      toast.success('Invitation resent');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
