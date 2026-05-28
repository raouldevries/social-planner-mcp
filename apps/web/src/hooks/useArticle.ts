/**
 * Social Planner - Article Hooks
 *
 * TanStack Query hooks for article CRUD operations and publishing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  ArticleSummary,
  ArticleDetail,
  CreateArticleRequest,
  UpdateArticleRequest,
  PaginatedResponse,
} from '@social-planner/shared';

// Query keys
export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters: ArticleFilters) => [...articleKeys.lists(), filters] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: string) => [...articleKeys.details(), id] as const,
};

export interface ArticleFilters {
  status?: string | undefined;
  authorId?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

/**
 * Hook to fetch paginated list of articles
 */
export function useArticles(filters: ArticleFilters = {}) {
  return useQuery({
    queryKey: articleKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.status) params.set('status', filters.status);
      if (filters.authorId) params.set('authorId', filters.authorId);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const { data } = await api.get<PaginatedResponse<ArticleSummary>>(
        `/articles?${params.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch a single article by ID
 */
export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: articleKeys.detail(id!),
    queryFn: async () => {
      const { data } = await api.get<ArticleDetail>(`/articles/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new article
 */
export function useCreateArticle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateArticleRequest) => {
      const { data: article } = await api.post<ArticleDetail>('/articles', data);
      return article;
    },
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      toast.success('Article created');
      navigate(`/articles/${article.id}`);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to update an existing article
 */
export function useUpdateArticle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateArticleRequest) => {
      const { data: article } = await api.patch<ArticleDetail>(
        `/articles/${id}`,
        data
      );
      return article;
    },
    onSuccess: (article) => {
      queryClient.setQueryData(articleKeys.detail(id), article);
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      toast.success('Article saved');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete an article
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/articles/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      toast.success('Article deleted');
      navigate('/articles');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to publish an article
 */
export function usePublishArticle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: article } = await api.post<ArticleDetail>(
        `/articles/${id}/publish`
      );
      return article;
    },
    onSuccess: (article) => {
      queryClient.setQueryData(articleKeys.detail(id), article);
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      toast.success('Article published');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to unpublish an article
 */
export function useUnpublishArticle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: article } = await api.post<ArticleDetail>(
        `/articles/${id}/unpublish`
      );
      return article;
    },
    onSuccess: (article) => {
      queryClient.setQueryData(articleKeys.detail(id), article);
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      toast.success('Article unpublished');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
