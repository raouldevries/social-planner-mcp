/**
 * MCP Hooks
 *
 * TanStack Query hooks for MCP client management and pending actions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  MCPClientInfo,
  MCPPendingActionSummary,
  MCPClientRegistration,
  MCPClientCredentials,
} from '@social-planner/shared';

// ============================================
// QUERY KEYS
// ============================================

export const mcpKeys = {
  all: ['mcp'] as const,
  clients: () => [...mcpKeys.all, 'clients'] as const,
  pendingActions: () => [...mcpKeys.all, 'pending-actions'] as const,
  pendingActionsCount: () => [...mcpKeys.all, 'pending-actions-count'] as const,
};

// ============================================
// CLIENT HOOKS
// ============================================

/**
 * Fetch list of MCP clients for the current user
 */
export function useMCPClients() {
  return useQuery({
    queryKey: mcpKeys.clients(),
    queryFn: async () => {
      const { data } = await api.get<{ clients: MCPClientInfo[] }>('/mcp/clients');
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Register a new MCP client
 */
export function useRegisterMCPClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registration: MCPClientRegistration) => {
      const { data } = await api.post<{
        client: MCPClientInfo;
        credentials: MCPClientCredentials;
      }>('/mcp/clients', registration);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.clients() });
      toast.success('MCP client registered successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to register MCP client';
      toast.error(message);
    },
  });
}

/**
 * Revoke an MCP client (soft delete)
 */
export function useRevokeMCPClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      await api.delete(`/mcp/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.clients() });
      toast.success('MCP client revoked');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to revoke MCP client';
      toast.error(message);
    },
  });
}

/**
 * Delete an MCP client permanently
 */
export function useDeleteMCPClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      await api.delete(`/mcp/clients/${clientId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.clients() });
      toast.success('MCP client deleted permanently');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to delete MCP client';
      toast.error(message);
    },
  });
}

// ============================================
// PENDING ACTIONS HOOKS
// ============================================

/**
 * Fetch pending MCP actions for the current user
 */
export function useMCPPendingActions() {
  return useQuery({
    queryKey: mcpKeys.pendingActions(),
    queryFn: async () => {
      const { data } = await api.get<{ actions: MCPPendingActionSummary[] }>(
        '/mcp/pending-actions'
      );
      return data;
    },
    refetchInterval: 30000, // Poll every 30s for new actions
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Fetch count of pending MCP actions (for badge display)
 */
export function useMCPPendingActionsCount() {
  return useQuery({
    queryKey: mcpKeys.pendingActionsCount(),
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/mcp/pending-actions/count');
      return data.count;
    },
    refetchInterval: 30000, // Poll every 30s
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Approve a pending MCP action
 */
export function useApproveMCPAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { data } = await api.post<{ success: boolean; message: string }>(
        `/mcp/pending-actions/${actionId}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActions() });
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActionsCount() });
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // Refresh posts if scheduling happened
      toast.success('Action approved and executed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to approve action';
      toast.error(message);
    },
  });
}

/**
 * Reject a pending MCP action
 */
export function useRejectMCPAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      await api.post(`/mcp/pending-actions/${actionId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActions() });
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActionsCount() });
      toast.success('Action rejected');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to reject action';
      toast.error(message);
    },
  });
}
