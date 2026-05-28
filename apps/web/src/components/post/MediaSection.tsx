/**
 * Media Section
 *
 * Component for displaying and managing media attachments.
 * Shows attached media with remove/reorder options.
 */

import { clsx } from 'clsx';
import type { PostMediaItem } from '@social-planner/shared';
import { Button } from '@/components/ui/Button';

interface MediaSectionProps {
  media: PostMediaItem[];
  onRemove: (mediaId: string) => void;
  onOpenLibrary: () => void;
  disabled?: boolean;
}

export function MediaSection({
  media,
  onRemove,
  onOpenLibrary,
  disabled = false,
}: MediaSectionProps) {
  return (
    <div className="space-y-4">
      {/* Media grid */}
      {media.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {media.map((item) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              onRemove={() => onRemove(item.mediaAssetId)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <div
          className={clsx(
            'bg-gray-50 rounded-xl py-12 px-6 text-center transition-all duration-200',
            !disabled && 'cursor-pointer hover:bg-gray-100 group',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={!disabled ? onOpenLibrary : undefined}
        >
          <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-3 group-hover:text-blue-500 transition-colors duration-200" />
          <p className="text-sm text-gray-500">Drop files or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4 up to 50MB</p>
        </div>
      )}

      {/* Actions */}
      {media.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenLibrary}
          disabled={disabled}
        >
          Add more media
        </Button>
      )}
    </div>
  );
}

interface MediaThumbnailProps {
  item: PostMediaItem;
  onRemove: () => void;
  disabled?: boolean;
}

function MediaThumbnail({ item, onRemove, disabled }: MediaThumbnailProps) {
  const isVideo = item.fileType.startsWith('video/');

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
      {isVideo ? (
        item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.altText || item.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
        )
      ) : (
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.altText || item.fileName}
          className="w-full h-full object-cover"
        />
      )}

      {/* Remove button - appears on hover */}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            'absolute top-1.5 right-1.5 p-1 rounded-full',
            'bg-black/60 text-white opacity-0 group-hover:opacity-100',
            'transition-all duration-150 hover:bg-black/80 hover:scale-110',
            'focus:opacity-100 focus:outline-none'
          )}
          title="Remove"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium">
          Video
        </div>
      )}
    </div>
  );
}

// Icons
function UploadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
