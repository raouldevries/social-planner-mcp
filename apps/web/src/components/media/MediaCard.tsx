/**
 * Media Card
 *
 * Displays a media asset thumbnail with hover overlay showing actions.
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { formatFileSize, formatDuration } from '@/lib/formatters';
import type { MediaAssetSummary } from '@social-planner/shared';

export interface MediaCardProps {
  asset: MediaAssetSummary;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: ((asset: MediaAssetSummary) => void) | undefined;
  onPreview?: ((asset: MediaAssetSummary) => void) | undefined;
  onDelete?: ((asset: MediaAssetSummary) => void) | undefined;
}

export function MediaCard({
  asset,
  selected = false,
  selectable = false,
  onSelect,
  onPreview,
  onDelete,
}: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = asset.fileType.startsWith('image/');
  const isVideo = asset.fileType.startsWith('video/');

  const handleClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect(asset);
    } else if (onPreview) {
      onPreview(asset);
    }
  }, [selectable, onSelect, onPreview, asset]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPreview?.(asset);
    },
    [onPreview, asset]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(asset);
    },
    [onDelete, asset]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${selectable ? (selected ? 'Deselect' : 'Select') : 'View'} ${asset.fileName}`}
      aria-pressed={selectable ? selected : undefined}
      className={clsx(
        'relative group rounded-lg overflow-hidden bg-gray-100 cursor-pointer transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        selected && 'ring-2 ring-primary-500 ring-offset-2',
        !selected && 'hover:ring-2 hover:ring-gray-300'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail */}
      <div className="aspect-square">
        {isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 relative">
            {asset.thumbnailUrl && !imageError ? (
              <>
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.fileName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <VideoIcon className="w-12 h-12 text-gray-400" />
            )}
            {/* Duration badge */}
            {asset.duration != null && asset.duration > 0 && (
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                {formatDuration(asset.duration)}
              </span>
            )}
          </div>
        ) : isImage ? (
          imageError ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          ) : (
            <img
              src={asset.thumbnailUrl || asset.url}
              alt={asset.fileName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Selection checkbox */}
      {selectable && (
        <div
          className={clsx(
            'absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            selected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white/80 border-gray-400 group-hover:border-gray-600'
          )}
        >
          {selected && <CheckIcon className="w-3 h-3 text-white" />}
        </div>
      )}

      {/* Hover overlay */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/50 flex flex-col justify-between p-2 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* File info */}
        <div className="text-white">
          <p className="text-xs font-medium truncate">{asset.fileName}</p>
          {asset.width && asset.height && (
            <p className="text-xs text-white/70">
              {asset.width} × {asset.height}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          {onPreview && (
            <button
              type="button"
              onClick={handlePreviewClick}
              className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              aria-label={`Preview ${asset.fileName}`}
            >
              <EyeIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1.5 rounded bg-white/20 hover:bg-red-500 text-white transition-colors"
              aria-label={`Delete ${asset.fileName}`}
            >
              <TrashIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* File size badge */}
      <div className="absolute bottom-2 left-2">
        <span
          className={clsx(
            'px-1.5 py-0.5 text-xs rounded transition-opacity',
            isHovered ? 'bg-black/70 text-white' : 'bg-white/80 text-gray-600'
          )}
        >
          {formatFileSize(asset.fileSize)}
        </span>
      </div>
    </div>
  );
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
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
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
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
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
