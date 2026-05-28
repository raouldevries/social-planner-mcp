/**
 * Post Card
 *
 * Displays a post summary in list views with thumbnail, content preview,
 * status badge, platform indicators, and metadata.
 *
 * Features subtle hover animation with lift + shadow for Apple-style feel.
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { POST_STATUS, SOCIAL_PLATFORM, type PostSummary } from '@social-planner/shared';
import { StatusBadge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { transitions } from '@/lib/animations';

interface PostCardProps {
  post: PostSummary;
  /** Navigation source for back button behavior */
  from?: 'calendar' | 'posts';
}

export function PostCard({ post, from = 'posts' }: PostCardProps) {
  const platforms = [...new Set(post.channels.map((c) => c.platform))];
  const baseContent = post.baseContent ?? '';
  const contentTruncated = baseContent.length > 100;
  const displayContent = contentTruncated
    ? `${baseContent.slice(0, 100)}...`
    : baseContent || 'No content';

  return (
    <Link to={`/posts/${post.id}`} state={{ from }} className="block">
      <motion.div
        className={clsx('bg-white rounded-xl border border-neutral-200', 'shadow-sm')}
        whileHover={{
          y: -2,
          boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -6px rgba(0, 0, 0, 0.05)',
        }}
        transition={transitions.fast}
      >
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt=""
                className="w-16 h-16 rounded-lg object-cover bg-neutral-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center">
                <ImagePlaceholderIcon className="w-6 h-6 text-neutral-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={post.status} />
                {/* Platform badges */}
                <div className="flex gap-1">
                  {platforms.map((platform) => (
                    <PlatformBadge key={platform} platform={platform} />
                  ))}
                </div>
              </div>
              {post.mediaCount > 0 && (
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <MediaIcon className="w-3.5 h-3.5" />
                  {post.mediaCount}
                </span>
              )}
            </div>

            {/* Content preview */}
            <p className="text-sm text-neutral-900 line-clamp-2 mb-2">{displayContent}</p>

            {/* Footer row */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-3">
                {/* Author */}
                <span className="flex items-center gap-1">
                  {post.author.avatarUrl ? (
                    <img
                      src={post.author.avatarUrl}
                      alt={post.author.fullName}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-neutral-300 flex items-center justify-center text-[8px] text-white font-medium">
                      {post.author.fullName.charAt(0)}
                    </div>
                  )}
                  {post.author.fullName}
                </span>

                {/* Date - label changes based on status */}
                <span>
                  {post.status === POST_STATUS.PUBLISHED && post.publishedAt
                    ? `Published: ${format(new Date(post.publishedAt), 'MMM d, HH:mm')}`
                    : post.status === POST_STATUS.SCHEDULED && post.scheduledAt
                      ? `Scheduled: ${format(new Date(post.scheduledAt), 'MMM d, HH:mm')}`
                      : post.scheduledAt
                        ? `Planned: ${format(new Date(post.scheduledAt), 'MMM d, HH:mm')}`
                        : `Updated: ${format(new Date(post.updatedAt), 'MMM d')}`}
                </span>
              </div>

              {/* Engagement indicators */}
              <div className="flex items-center gap-2">
                {post.commentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CommentIcon className="w-3.5 h-3.5" />
                    {post.commentCount}
                  </span>
                )}
                {post.collaborators && post.collaborators.length > 0 ? (
                  <AvatarGroup
                    avatars={post.collaborators.map((c) => ({
                      name: c.user.fullName,
                      src: c.user.avatarUrl,
                    }))}
                    max={3}
                    size="xs"
                  />
                ) : post.collaboratorCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3.5 h-3.5" />
                    {post.collaboratorCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

interface PlatformBadgeProps {
  platform: string;
}

function PlatformBadge({ platform }: PlatformBadgeProps) {
  const isInstagram = platform === SOCIAL_PLATFORM.INSTAGRAM;

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center w-5 h-5 rounded text-white text-[10px] font-medium',
        isInstagram ? 'bg-pink-500' : 'bg-blue-600'
      )}
      title={platform}
    >
      {isInstagram ? 'IG' : 'LI'}
    </span>
  );
}

// Icons
function ImagePlaceholderIcon({ className }: { className?: string }) {
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

function MediaIcon({ className }: { className?: string }) {
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
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}
