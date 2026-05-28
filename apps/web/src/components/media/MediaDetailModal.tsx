/**
 * Media Detail Modal
 *
 * Shows full preview and metadata for a media asset.
 */

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { formatFileSize, formatDuration } from '@/lib/formatters';
import {
  useMediaAsset,
  useUpdateMedia,
  useDeleteMedia,
  useMediaDownloadUrl,
} from '@/hooks/useMedia';
import type { MediaAssetSummary } from '@social-planner/shared';

interface MediaDetailModalProps {
  asset: MediaAssetSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onUse?: (asset: MediaAssetSummary) => void;
  showUseButton?: boolean;
}

export function MediaDetailModal({
  asset,
  isOpen,
  onClose,
  onUse,
  showUseButton = false,
}: MediaDetailModalProps) {
  const [altText, setAltText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch full asset details - only when we have an asset ID
  const assetId = asset?.id;
  const { data: assetDetail, isLoading } = useMediaAsset(assetId);
  const { data: downloadUrl, isLoading: isDownloadUrlLoading } = useMediaDownloadUrl(assetId);

  // Mutations - only create when we have a valid ID
  const updateMedia = useUpdateMedia(assetId ?? '');
  const deleteMedia = useDeleteMedia();

  // Sync alt text from asset detail
  useEffect(() => {
    if (assetDetail?.altText) {
      setAltText(assetDetail.altText);
    } else {
      setAltText('');
    }
  }, [assetDetail]);

  const handleSaveAltText = useCallback(() => {
    if (!asset) return;
    // Only include altText if it has a value
    if (altText.trim()) {
      updateMedia.mutate({ altText });
    } else {
      updateMedia.mutate({});
    }
  }, [asset, altText, updateMedia]);

  const handleDelete = useCallback(() => {
    if (!asset) return;
    deleteMedia.mutate(asset.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  }, [asset, deleteMedia, onClose]);

  const handleUse = useCallback(() => {
    if (asset && onUse) {
      onUse(asset);
      onClose();
    }
  }, [asset, onUse, onClose]);

  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }, [downloadUrl]);

  if (!asset) return null;

  const isImage = asset.fileType.startsWith('image/');
  const isVideo = asset.fileType.startsWith('video/');

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Media Details" size="lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] max-h-[400px]">
              {isVideo ? (
                <video src={asset.url} controls className="max-w-full max-h-[400px]">
                  Your browser does not support the video tag.
                </video>
              ) : isImage ? (
                <img
                  src={asset.url}
                  alt={assetDetail?.altText || asset.fileName}
                  className="max-w-full max-h-[400px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <FileIcon className="w-16 h-16 mb-2" />
                  <span>Preview not available</span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">File name</dt>
                <dd className="font-medium text-gray-900 truncate" title={asset.fileName}>
                  {asset.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900">{asset.fileType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Size</dt>
                <dd className="font-medium text-gray-900">{formatFileSize(asset.fileSize)}</dd>
              </div>
              {asset.width && asset.height && (
                <div>
                  <dt className="text-gray-500">Dimensions</dt>
                  <dd className="font-medium text-gray-900">
                    {asset.width} × {asset.height} px
                  </dd>
                </div>
              )}
              {asset.duration && (
                <div>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-medium text-gray-900">{formatDuration(asset.duration)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Uploaded</dt>
                <dd className="font-medium text-gray-900">
                  {format(new Date(asset.createdAt), 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
              {asset.uploadedBy && (
                <div>
                  <dt className="text-gray-500">Uploaded by</dt>
                  <dd className="font-medium text-gray-900">{asset.uploadedBy.name}</dd>
                </div>
              )}
            </dl>

            {/* Alt text editor */}
            <div>
              <label htmlFor="alt-text" className="block text-sm font-medium text-gray-700 mb-1">
                Alt text
              </label>
              <div className="flex gap-2">
                <Input
                  id="alt-text"
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe this image for accessibility..."
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveAltText}
                  disabled={updateMedia.isPending}
                >
                  {updateMedia.isPending ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!downloadUrl || isDownloadUrlLoading}
                >
                  {isDownloadUrlLoading ? (
                    <Spinner size="sm" className="mr-1" />
                  ) : (
                    <DownloadIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  )}
                  Download
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  <TrashIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  Delete
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                {showUseButton && onUse && (
                  <Button variant="primary" onClick={handleUse}>
                    Use this file
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Media"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{asset.fileName}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteMedia.isPending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteMedia.isPending}>
              {deleteMedia.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Icons
function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}
