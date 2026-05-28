/**
 * Media Library Page
 *
 * Full media library with upload, search, filtering, and management.
 * Apple-style unified toolbar with segmented controls.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MediaGrid, MediaFilters, MediaDetailModal } from '@/components/media';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import {
  useMedia,
  useUploadMultipleMedia,
  useDeleteMedia,
  type MediaFilters as MediaFiltersType,
} from '@/hooks/useMedia';
import { useDebounce } from '@/hooks/useDebounce';
import type { MediaAssetSummary } from '@social-planner/shared';

type MediaType = '' | 'image' | 'video';
const validTypes = new Set(['', 'image', 'video']);

// Accepted file types
const ACCEPTED_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

export function Media() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse and validate URL params
  const typeParam = searchParams.get('type') || '';
  const validatedType: MediaType = validTypes.has(typeParam) ? (typeParam as MediaType) : '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const searchParam = searchParams.get('search') || '';

  // Local state
  const [searchInput, setSearchInput] = useState(searchParam);
  const [typeFilter, setTypeFilter] = useState<MediaType>(validatedType);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  // Sync local state with URL params when they change (browser back/forward)
  useEffect(() => {
    setSearchInput(searchParam);
    setTypeFilter(validatedType);
  }, [searchParam, validatedType]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Build query params
  const queryParams = useMemo((): MediaFiltersType => {
    return {
      type: typeFilter || undefined,
      search: debouncedSearch || undefined,
      page: currentPage,
      perPage: 30,
    };
  }, [typeFilter, debouncedSearch, currentPage]);

  // Fetch media
  const { data, isLoading, isError, refetch } = useMedia(queryParams);
  const uploadMedia = useUploadMultipleMedia();
  const deleteMedia = useDeleteMedia();

  // Sync URL with filter state
  const updateUrlParams = useCallback(
    (updates: { search?: string; type?: MediaType; page?: number }) => {
      const params = new URLSearchParams(searchParams);

      if (updates.search !== undefined) {
        if (updates.search) {
          params.set('search', updates.search);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
      }

      if (updates.type !== undefined) {
        if (updates.type) {
          params.set('type', updates.type);
        } else {
          params.delete('type');
        }
        params.set('page', '1');
      }

      if (updates.page !== undefined) {
        params.set('page', String(updates.page));
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Handlers
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchInput(search);
      updateUrlParams({ search });
    },
    [updateUrlParams]
  );

  const handleTypeChange = useCallback(
    (type: MediaType) => {
      setTypeFilter(type);
      updateUrlParams({ type });
    },
    [updateUrlParams]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setTypeFilter('');
    setSearchParams({});
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrlParams({ page });
    },
    [updateUrlParams]
  );

  // Open file picker directly
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection from picker
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      uploadMedia.mutate(Array.from(files));

      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [uploadMedia]
  );

  const handlePreview = useCallback((asset: MediaAssetSummary) => {
    setSelectedAsset(asset);
  }, []);

  const handleDelete = useCallback(
    (asset: MediaAssetSummary) => {
      deleteMedia.mutate(asset.id);
    },
    [deleteMedia]
  );

  const handleSelect = useCallback((asset: MediaAssetSummary) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  }, [selectedIds.size]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeletePending(true);

    // Delete items sequentially to avoid overwhelming the server
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteMedia.mutate(id, {
            onSuccess: () => resolve(),
            onError: () => reject(),
          });
        });
      } catch {
        // Continue with remaining deletions even if one fails
      }
    }

    setBulkDeletePending(false);
    setShowBulkDeleteConfirm(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, deleteMedia]);

  const handleCancelSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const assets = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalItems = data?.pagination?.total || 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden file input - triggered by Upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Header */}
      <div
        className="mb-8"
        data-feedback-target="media-header"
        data-feedback-label="Media Library Header"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                Media Library
              </h1>
              {totalItems > 0 && (
                <span className="text-sm text-neutral-500">
                  {totalItems} {totalItems === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1">Upload and manage your media files</p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button variant="secondary" size="sm" onClick={handleCancelSelection}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  disabled={selectedIds.size === 0}
                >
                  Delete ({selectedIds.size})
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={assets.length === 0}
                >
                  Select
                </Button>
                <Button size="sm" onClick={handleUploadClick} disabled={uploadMedia.isPending}>
                  {uploadMedia.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-1.5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-1.5" />
                      Upload
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div data-feedback-target="media-filters" data-feedback-label="Media Filters">
          <MediaFilters
            search={searchInput}
            type={typeFilter}
            onSearchChange={handleSearchChange}
            onTypeChange={handleTypeChange}
            onClear={handleClearFilters}
          />
        </div>
      </div>

      {/* Content Area */}
      <div data-feedback-target="media-content" data-feedback-label="Media Content">
        {/* Content */}
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="mb-4">Failed to load media</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div data-feedback-target="media-grid" data-feedback-label="Media Grid">
              <MediaGrid
                assets={assets}
                loading={isLoading}
                selectable={selectionMode}
                selectedIds={selectedIds}
                onSelect={selectionMode ? handleSelect : undefined}
                onPreview={selectionMode ? undefined : handlePreview}
                onDelete={selectionMode ? undefined : handleDelete}
                onUploadClick={handleUploadClick}
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                className="flex items-center justify-center gap-4 mt-6"
                aria-label="Media library pagination"
                data-feedback-target="media-pagination"
                data-feedback-label="Media Pagination"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Go to previous page"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600" aria-current="page">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Go to next page"
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <MediaDetailModal
        asset={selectedAsset}
        isOpen={selectedAsset !== null}
        onClose={() => setSelectedAsset(null)}
      />

      {/* Bulk Delete Confirmation */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => !bulkDeletePending && setShowBulkDeleteConfirm(false)}
        title="Delete Selected Media"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete {selectedIds.size} file
            {selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={bulkDeletePending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDeleteConfirm} disabled={bulkDeletePending}>
              {bulkDeletePending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} file${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}
