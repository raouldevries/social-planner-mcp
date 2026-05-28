/**
 * Media Picker Modal
 *
 * Modal for selecting media from the library or uploading new files.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui/Tabs';
import { MediaGrid } from './MediaGrid';
import { MediaUploader } from './MediaUploader';
import { MediaFilters } from './MediaFilters';
import {
  useMedia,
  useUploadMultipleMedia,
  type MediaFilters as MediaFiltersType,
} from '@/hooks/useMedia';
import { useDebounce } from '@/hooks/useDebounce';
import type { MediaAssetSummary } from '@social-planner/shared';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAssetSummary[]) => void;
  multiple?: boolean;
  acceptedTypes?: ('image' | 'video')[];
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  acceptedTypes,
}: MediaPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAssets, setSelectedAssets] = useState<MediaAssetSummary[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'image' | 'video'>('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Reset state when modal opens (to handle reopening with stale state)
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSelectedAssets([]);
      setSearchInput('');
      setTypeFilter('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Handle modal close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Build query params
  const queryParams = useMemo((): MediaFiltersType => {
    // If acceptedTypes is specified, use it; otherwise use user's filter
    let type: 'image' | 'video' | undefined;
    if (typeFilter) {
      type = typeFilter;
    } else if (acceptedTypes && acceptedTypes.length === 1) {
      type = acceptedTypes[0];
    }

    return {
      type,
      search: debouncedSearch || undefined,
      page: currentPage,
      perPage: 24,
    };
  }, [typeFilter, debouncedSearch, currentPage, acceptedTypes]);

  // Fetch media
  const { data, isLoading } = useMedia(queryParams);
  const uploadMedia = useUploadMultipleMedia();

  // Handle selection
  const handleSelect = useCallback(
    (asset: MediaAssetSummary) => {
      if (multiple) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(asset.id)) {
            next.delete(asset.id);
            setSelectedAssets((assets) => assets.filter((a) => a.id !== asset.id));
          } else {
            next.add(asset.id);
            setSelectedAssets((assets) => [...assets, asset]);
          }
          return next;
        });
      } else {
        setSelectedIds(new Set([asset.id]));
        setSelectedAssets([asset]);
      }
    },
    [multiple]
  );

  // Handle confirm selection
  const handleConfirm = useCallback(() => {
    onSelect(selectedAssets);
    handleClose();
  }, [selectedAssets, onSelect, handleClose]);

  // Handle upload
  const handleUpload = useCallback(
    (files: File[]) => {
      uploadMedia.mutate(files, {
        onSuccess: (uploadedAssets) => {
          // Auto-select newly uploaded files (use MediaAssetSummary directly)
          const summaries: MediaAssetSummary[] = uploadedAssets.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            fileType: a.fileType,
            fileSize: a.fileSize,
            url: a.url,
            thumbnailUrl: a.thumbnailUrl,
            width: a.width,
            height: a.height,
            duration: a.duration,
            altText: a.altText,
            createdAt: a.createdAt,
            uploadedBy: a.uploadedBy,
            canEdit: a.canEdit,
            canDelete: a.canDelete,
          }));

          if (multiple) {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              summaries.forEach((a) => next.add(a.id));
              return next;
            });
            setSelectedAssets((prev) => [...prev, ...summaries]);
          } else {
            const firstSummary = summaries[0];
            if (firstSummary) {
              setSelectedIds(new Set([firstSummary.id]));
              setSelectedAssets([firstSummary]);
            }
          }
        },
      });
    },
    [uploadMedia, multiple]
  );

  // Handle filter clear
  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setTypeFilter('');
    setCurrentPage(1);
  }, []);

  // Handle type change - only allow if not restricted
  const handleTypeChange = useCallback(
    (type: '' | 'image' | 'video') => {
      if (!acceptedTypes || acceptedTypes.includes(type as 'image' | 'video') || type === '') {
        setTypeFilter(type);
        setCurrentPage(1);
      }
    },
    [acceptedTypes]
  );

  // Handle search change
  const handleSearchChange = useCallback((search: string) => {
    setSearchInput(search);
    setCurrentPage(1);
  }, []);

  const assets = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select Media" size="xl">
      <div className="flex flex-col h-[600px] max-h-[calc(100vh-10rem)] overflow-hidden">
        <Tabs defaultTab="library" className="flex-1 min-h-0 flex flex-col">
          <TabList>
            <Tab id="library">Library</Tab>
            <Tab id="upload">Upload</Tab>
          </TabList>

          <TabPanels className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Library tab */}
            <TabPanel id="library" className="flex-1 min-h-0 flex flex-col">
              {/* Filters */}
              <div className="py-4">
                <MediaFilters
                  search={searchInput}
                  type={typeFilter}
                  onSearchChange={handleSearchChange}
                  onTypeChange={handleTypeChange}
                  onClear={handleClearFilters}
                />
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto pb-4">
                <MediaGrid
                  assets={assets}
                  loading={isLoading}
                  selectable
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="flex items-center justify-center gap-2 py-4 border-t"
                  aria-label="Media library pagination"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Go to next page"
                  >
                    Next
                  </Button>
                </nav>
              )}
            </TabPanel>

            {/* Upload tab */}
            <TabPanel id="upload" className="h-full flex flex-col justify-center">
              <MediaUploader
                onUpload={handleUpload}
                uploading={uploadMedia.isPending}
                multiple={multiple}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <div className="text-sm text-gray-600">
            {selectedAssets.length > 0
              ? `${selectedAssets.length} file${selectedAssets.length !== 1 ? 's' : ''} selected`
              : 'No files selected'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={selectedAssets.length === 0}
            >
              {multiple ? 'Add Selected' : 'Select'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
