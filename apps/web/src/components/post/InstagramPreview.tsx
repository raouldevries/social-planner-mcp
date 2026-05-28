/**
 * Instagram Preview
 *
 * Shows how the post will appear on Instagram feed.
 * Mimics Instagram's post layout with avatar, media, actions, and caption.
 */

import { useState, useEffect } from 'react';
import type { PostMediaItem, SocialAccountSummary } from '@social-planner/shared';
import { PlatformIcon } from '@/components/social-accounts/PlatformIcon';

interface InstagramPreviewProps {
  content: string;
  media: PostMediaItem[];
  account: SocialAccountSummary;
}

const CAPTION_TRUNCATE_LENGTH = 125;

export function InstagramPreview({ content, media, account }: InstagramPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMedia = media.length > 0;
  const currentMedia = media[currentIndex];
  const isVideo = currentMedia?.fileType.startsWith('video/');

  useEffect(() => {
    setCurrentIndex((prev) => (prev >= media.length ? 0 : prev));
  }, [media.length]);
  const shouldTruncate = content.length > CAPTION_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate
    ? content.slice(0, CAPTION_TRUNCATE_LENGTH).trim()
    : content;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[320px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {account.profileImageUrl && !imageError ? (
          <img
            src={account.profileImageUrl}
            alt={account.accountName}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <PlatformIcon platform={account.platform} className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-sm font-semibold text-gray-900">{account.accountName}</span>
        <MoreIcon className="ml-auto w-4 h-4 text-gray-900" />
      </div>

      {/* Media */}
      <div className="aspect-square bg-gray-100 relative group/media">
        {hasMedia ? (
          <>
            {isVideo && currentMedia ? (
              <video
                src={currentMedia.url}
                poster={currentMedia.thumbnailUrl || undefined}
                controls
                className="w-full h-full bg-gray-900 object-contain"
                preload="metadata"
              />
            ) : currentMedia ? (
              <img
                src={currentMedia.url}
                alt={currentMedia.altText || 'Post media'}
                className="w-full h-full object-cover"
              />
            ) : null}
            {media.length > 1 && (
              <>
                <div className="absolute top-3 right-3">
                  <CarouselIcon className="w-5 h-5 text-white drop-shadow-md" />
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
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-blue-500' : 'bg-white/70'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <CameraIcon className="w-12 h-12 mb-2" />
            <span className="text-xs">Add media to preview</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-4">
          <HeartIcon className="w-6 h-6 text-gray-900 cursor-pointer" />
          <CommentIcon className="w-6 h-6 text-gray-900 cursor-pointer" />
          <ShareIcon className="w-6 h-6 text-gray-900 cursor-pointer" />
          <BookmarkIcon className="w-6 h-6 text-gray-900 cursor-pointer ml-auto" />
        </div>

        {/* Likes */}
        <p className="text-sm font-semibold text-gray-900 mt-2">0 likes</p>

        {/* Caption */}
        <div className="mt-1 overflow-hidden">
          {content ? (
            <p className="text-sm text-gray-900 break-words">
              <span className="font-semibold">{account.accountName}</span> {displayContent}
              {shouldTruncate && <span className="text-gray-400 cursor-pointer"> more</span>}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Start typing to see preview...</p>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-gray-400 uppercase mt-2">Just now</p>
      </div>
    </div>
  );
}

// Icons
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
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
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
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
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
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
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
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

function CarouselIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6h12v12H4V6zm14-2H6v14h12V4zm2 2v12h-2V6h2z" />
    </svg>
  );
}
