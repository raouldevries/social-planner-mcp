/**
 * Social Planner - Media Hooks
 *
 * TanStack Query hooks for media asset CRUD operations and folder management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  MediaAssetSummary,
  MediaAssetDetail,
  MediaFolderSummary,
  MediaFolderDetail,
  UpdateMediaAssetRequest,
  CreateFolderRequest,
  PaginatedResponse,
} from '@social-planner/shared';

// Query keys
export const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (filters: MediaFilters) => [...mediaKeys.lists(), filters] as const,
  details: () => [...mediaKeys.all, 'detail'] as const,
  detail: (id: string) => [...mediaKeys.details(), id] as const,
  folders: () => [...mediaKeys.all, 'folders'] as const,
  folder: (id: string) => [...mediaKeys.folders(), id] as const,
};

export interface MediaFilters {
  type?: 'image' | 'video' | undefined;
  search?: string | undefined;
  folderId?: string | null | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

/**
 * Hook to fetch paginated list of media assets
 */
export function useMedia(filters: MediaFilters = {}) {
  return useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      if (filters.folderId !== undefined) {
        params.set('folderId', filters.folderId === null ? '' : filters.folderId);
      }
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const { data } = await api.get<PaginatedResponse<MediaAssetSummary>>(
        `/media?${params.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch a single media asset by ID
 */
export function useMediaAsset(id: string | undefined) {
  return useQuery({
    queryKey: mediaKeys.detail(id!),
    queryFn: async () => {
      const { data } = await api.get<MediaAssetDetail>(`/media/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch download URL for a media asset
 */
export function useMediaDownloadUrl(id: string | undefined) {
  return useQuery({
    queryKey: [...mediaKeys.detail(id!), 'download'],
    queryFn: async () => {
      const { data } = await api.get<{ url: string }>(`/media/${id}/download`);
      return data.url;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes (presigned URLs expire)
  });
}

/**
 * Hook to upload a single file
 */
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post<MediaAssetDetail>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success('File uploaded');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to upload multiple files
 */
export function useUploadMultipleMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const { data } = await api.post<{ assets: MediaAssetDetail[] }>(
        '/media/upload-multiple',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data.assets;
    },
    onSuccess: (assets) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(`${assets.length} file${assets.length !== 1 ? 's' : ''} uploaded`);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to update a media asset
 */
export function useUpdateMedia(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMediaAssetRequest) => {
      const { data: asset } = await api.patch<MediaAssetDetail>(`/media/${id}`, data);
      return asset;
    },
    onSuccess: (asset) => {
      queryClient.setQueryData(mediaKeys.detail(id), asset);
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast.success('Media updated');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete a media asset
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/media/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success('Media deleted');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

// ============================================
// Folder Hooks
// ============================================

/**
 * Hook to fetch list of folders
 */
export function useFolders() {
  return useQuery({
    queryKey: mediaKeys.folders(),
    queryFn: async () => {
      const { data } = await api.get<MediaFolderSummary[]>('/media/folders');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single folder
 */
export function useFolder(id: string | undefined) {
  return useQuery({
    queryKey: mediaKeys.folder(id!),
    queryFn: async () => {
      const { data } = await api.get<MediaFolderDetail>(`/media/folders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFolderRequest) => {
      const { data: folder } = await api.post<MediaFolderDetail>('/media/folders', data);
      return folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.folders() });
      toast.success('Folder created');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/media/folders/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.folders() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast.success('Folder deleted');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
