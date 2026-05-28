/**
 * Social Planner - Feedback Hooks
 *
 * TanStack Query hooks for feedback CRUD operations and screenshot uploads.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  FeedbackSummary,
  FeedbackReply,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  CreateFeedbackReplyRequest,
  PaginatedResponse,
} from '@social-planner/shared';

// Query keys
export const feedbackKeys = {
  all: ['feedback'] as const,
  lists: () => [...feedbackKeys.all, 'list'] as const,
  list: (filters: FeedbackFilters) => [...feedbackKeys.lists(), filters] as const,
  replies: (feedbackId: string) => [...feedbackKeys.all, 'replies', feedbackId] as const,
};

export interface FeedbackFilters {
  status?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

/**
 * Hook to fetch paginated list of feedback (admin only)
 */
export function useFeedbacks(filters: FeedbackFilters = {}) {
  return useQuery({
    queryKey: feedbackKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.status) params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const { data } = await api.get<PaginatedResponse<FeedbackSummary>>(
        `/feedback?${params.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create feedback (any authenticated user)
 */
export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFeedbackRequest) => {
      const { data: feedback } = await api.post<FeedbackSummary>('/feedback', data);
      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success('Feedback submitted — thank you!');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to update feedback status (admin only)
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateFeedbackRequest & { id: string }) => {
      const { data: feedback } = await api.patch<FeedbackSummary>(`/feedback/${id}`, data);
      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success('Feedback updated');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to update feedback content (owner only)
 */
export function useUpdateFeedbackContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data: feedback } = await api.patch<FeedbackSummary>(`/feedback/${id}/content`, {
        content,
      });
      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success('Feedback updated');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete feedback (admin only)
 */
export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/feedback/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success('Feedback deleted');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to fetch replies for a feedback item
 */
export function useFeedbackReplies(feedbackId: string | null) {
  return useQuery({
    queryKey: feedbackKeys.replies(feedbackId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<FeedbackReply[]>(`/feedback/${feedbackId}/replies`);
      return data;
    },
    enabled: !!feedbackId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a reply on a feedback item
 */
export function useCreateFeedbackReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ feedbackId, content }: { feedbackId: string; content: string }) => {
      const { data } = await api.post<FeedbackReply>(`/feedback/${feedbackId}/replies`, {
        content,
      } as CreateFeedbackReplyRequest);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.replies(variables.feedbackId) });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete a feedback reply
 */
export function useDeleteFeedbackReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId }: { replyId: string; feedbackId: string }) => {
      await api.delete(`/feedback/replies/${replyId}`);
      return replyId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.replies(variables.feedbackId) });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to upload a base64-encoded screenshot and return the URL
 */
export function useUploadScreenshot() {
  return useMutation({
    mutationFn: async (imageBase64: string) => {
      const { data } = await api.post<{ url: string }>('/feedback/upload-screenshot', {
        imageBase64,
      });
      return data.url;
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
