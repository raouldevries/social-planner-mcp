/**
 * LinkedIn Preview
 *
 * Shows how the post will appear on LinkedIn feed.
 * Mimics LinkedIn's post layout with professional styling.
 */

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { PostMediaItem, SocialAccountSummary } from '@social-planner/shared';
import { PlatformIcon } from '@/components/social-accounts/PlatformIcon';

interface LinkedInPreviewProps {
  content: string;
  media: PostMediaItem[];
  account: SocialAccountSummary;
}

const CONTENT_TRUNCATE_LENGTH = 200;

export function LinkedInPreview({ content, media, account }: LinkedInPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMedia = media.length > 0;
  const currentMedia = media[currentIndex];
  const isVideo = currentMedia?.fileType.startsWith('video/');

  useEffect(() => {
    setCurrentIndex((prev) => (prev >= media.length ? 0 : prev));
  }, [media.length]);
  const shouldTruncate = content.length > CONTENT_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate
    ? content.slice(0, CONTENT_TRUNCATE_LENGTH).trim()
    : content;

  return (
    <div className="max-w-[400px] mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-2.5 px-3 py-3">
          {account.profileImageUrl && !imageError ? (
            <img
              src={account.profileImageUrl}
              alt={account.accountName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <PlatformIcon platform={account.platform} className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{account.accountName}</p>
            <p className="text-xs text-gray-500">
              {account.accountType
                ? account.accountType.charAt(0) + account.accountType.slice(1).toLowerCase()
                : 'Professional'}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>Just now</span>
              <span>·</span>
              <GlobeIcon className="w-3 h-3" />
            </p>
          </div>
          <MoreIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
        </div>

        {/* Content */}
        <div className="px-3 pb-2 overflow-hidden">
          {content ? (
            <p
              className={clsx(
                'text-sm text-gray-900 whitespace-pre-wrap break-words',
                shouldTruncate && 'line-clamp-3'
              )}
            >
              {displayContent}
              {shouldTruncate && <span className="text-gray-500 cursor-pointer">...see more</span>}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Start typing to see preview...</p>
          )}
        </div>

        {/* Media */}
        {hasMedia && currentMedia ? (
          <div className="relative group/media">
            {isVideo ? (
              <video
                src={currentMedia.url}
                poster={currentMedia.thumbnailUrl || undefined}
                controls
                className="w-full aspect-video bg-gray-900 object-contain"
                preload="metadata"
              />
            ) : (
              <img
                src={currentMedia.url}
                alt={currentMedia.altText || 'Post media'}
                className="w-full aspect-video object-cover"
              />
            )}
            {media.length > 1 && (
              <>
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
                  {currentIndex + 1}/{media.length}
                </div>
                {/* Left arrow */}
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity"
                  >
                    <ChevronLeftIcon className="w-4 h-4 text-gray-800" />
                  </button>
                )}
                {/* Right arrow */}
                {currentIndex < media.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity"
                  >
                    <ChevronRightIcon className="w-4 h-4 text-gray-800" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mx-3 mb-3 aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="w-10 h-10 mb-2" />
            <span className="text-xs">Add media to preview</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-around px-3 py-2 border-t border-gray-100">
          <ActionButton icon={<LikeIcon />} label="Like" />
          <ActionButton icon={<CommentIcon />} label="Comment" />
          <ActionButton icon={<RepostIcon />} label="Repost" />
          <ActionButton icon={<SendIcon />} label="Send" />
        </div>
      </div>
    </div>
  );
}

// Icons
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM5.78 1.84a6.52 6.52 0 00-3.4 3.86h2.52c.13-1.38.4-2.69.88-3.86zM1.5 8c0 .58.08 1.14.22 1.68h2.96A16.5 16.5 0 014.5 8c0-.58.04-1.14.1-1.68H1.72A6.52 6.52 0 001.5 8zm.88 3.3a6.52 6.52 0 003.4 3.86 11.53 11.53 0 01-.88-3.86H2.38zm8.22 3.86a6.52 6.52 0 003.4-3.86h-2.52c-.13 1.38-.4 2.69-.88 3.86zM14.5 8c0-.58-.08-1.14-.22-1.68h-2.96c.06.54.1 1.1.1 1.68s-.04 1.14-.1 1.68h2.96c.14-.54.22-1.1.22-1.68zm-.88-3.3a6.52 6.52 0 00-3.4-3.86c.48 1.17.75 2.48.88 3.86h2.52zM8 1.5c-.99 0-2.19 1.61-2.7 4.82h5.4C10.19 3.11 8.99 1.5 8 1.5zm-2.82 6.18c-.04.42-.06.86-.06 1.32s.02.9.06 1.32h5.64c.04-.42.06-.86.06-1.32s-.02-.9-.06-1.32H5.18zM8 14.5c.99 0 2.19-1.61 2.7-4.82h-5.4C5.81 12.89 7.01 14.5 8 14.5z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function LikeIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
      />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}
