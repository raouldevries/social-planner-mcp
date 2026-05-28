/**
 * Media Grid
 *
 * Displays media assets in a responsive grid layout with selection support.
 * Features enhanced empty state with direct upload CTA.
 */

import { motion } from 'motion/react';
import { MediaCard } from './MediaCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MediaAssetSummary } from '@social-planner/shared';

export interface MediaGridProps {
  assets: MediaAssetSummary[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: ((asset: MediaAssetSummary) => void) | undefined;
  onPreview?: ((asset: MediaAssetSummary) => void) | undefined;
  onDelete?: ((asset: MediaAssetSummary) => void) | undefined;
  onUploadClick?: () => void;
}

export function MediaGrid({
  assets,
  loading = false,
  selectable = false,
  selectedIds = new Set(),
  onSelect,
  onPreview,
  onDelete,
  onUploadClick,
}: MediaGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        {/* Large illustration */}
        <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <EmptyMediaIcon className="w-12 h-12 text-gray-400" />
        </div>

        {/* Copy */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No media files yet</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Upload images and videos to build your media library for social posts
        </p>

        {/* Direct CTA */}
        {onUploadClick && (
          <Button onClick={onUploadClick}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {assets.map((asset, index) => (
        <motion.div
          key={asset.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: index * 0.03,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <MediaCard
            asset={asset}
            selected={selectedIds.has(asset.id)}
            selectable={selectable}
            onSelect={onSelect}
            onPreview={onPreview}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}

function EmptyMediaIcon({ className }: { className?: string }) {
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
