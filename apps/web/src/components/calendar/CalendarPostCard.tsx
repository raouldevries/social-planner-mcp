/**
 * Calendar Post Card
 *
 * Custom event renderer for FullCalendar displaying post cards
 * with refined, Apple-inspired visual design.
 *
 * Design principles applied:
 * - Cards feel like physical items you could pick up
 * - Status colors are subtle (tinted backgrounds, not harsh badges)
 * - Platform indicators are elegant, not demanding
 * - Smooth, satisfying hover transitions
 */

import { memo, useMemo } from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import type { PostSummary } from '@social-planner/shared';
import { POST_STATUS, SOCIAL_PLATFORM } from '@social-planner/shared';

// Status styling - muted, sophisticated palette
// Using CSS custom properties for theming support
const statusStyles: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  [POST_STATUS.DRAFT]: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  },
  [POST_STATUS.PENDING_APPROVAL]: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200/60',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  [POST_STATUS.APPROVED]: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200/60',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  [POST_STATUS.SCHEDULED]: {
    bg: 'bg-violet-50/80',
    border: 'border-violet-200/60',
    text: 'text-violet-800',
    dot: 'bg-violet-500',
  },
  [POST_STATUS.PUBLISHED]: {
    bg: 'bg-green-50/80',
    border: 'border-green-200/60',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  [POST_STATUS.REJECTED]: {
    bg: 'bg-red-50/80',
    border: 'border-red-200/60',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
  [POST_STATUS.UNPUBLISHED]: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  },
};

// Platform styling - refined brand colors
const platformConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  [SOCIAL_PLATFORM.INSTAGRAM]: {
    icon: <InstagramIcon />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  [SOCIAL_PLATFORM.LINKEDIN]: {
    icon: <LinkedInIcon />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

interface CalendarPostCardProps {
  eventInfo: EventContentArg;
}

/**
 * Memoized post card component for optimal calendar performance.
 * Each card represents a post on the calendar grid.
 */
export const CalendarPostCard = memo(function CalendarPostCard({
  eventInfo,
}: CalendarPostCardProps) {
  const post = eventInfo.event.extendedProps.post as PostSummary;

  // Extract unique platforms from channels
  const platforms = useMemo(() => {
    if (!post?.channels) return [];
    return [...new Set(post.channels.map((c) => c.platform))];
  }, [post?.channels]);

  // Get status styling with guaranteed fallback
  const defaultStyle = {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  };
  const style = (post?.status ? statusStyles[post.status] : undefined) ?? defaultStyle;

  // Truncate content intelligently
  const displayContent = useMemo(() => {
    if (!post?.baseContent) return 'Untitled post';
    const content = post.baseContent.trim();
    if (content.length <= 60) return content;
    // Find a good break point (word boundary)
    const truncated = content.slice(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 40 ? truncated.slice(0, lastSpace) + '…' : truncated + '…';
  }, [post?.baseContent]);

  // Fallback for missing post data
  if (!post) {
    return (
      <div className="px-2 py-1 text-xs text-neutral-500 truncate">{eventInfo.event.title}</div>
    );
  }

  return (
    <div
      className={`
        group relative flex flex-col gap-1 p-2 h-full overflow-hidden
        rounded-md border cursor-pointer
        ${style.bg} ${style.border}
        transition-all duration-200 ease-out
        hover:shadow-card-hover hover:scale-[1.01]
        active:scale-[0.99]
      `}
      // Improved touch target - minimum 44px tap area via padding
    >
      {/* Top row: Platform indicators + Time */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Platform badges - elegant, small */}
        <div className="flex items-center gap-1">
          {platforms.map((platform) => {
            const config = platformConfig[platform];
            if (!config) return null;
            return (
              <span
                key={platform}
                className={`
                  flex items-center justify-center w-5 h-5 rounded
                  ${config.bgColor} ${config.color}
                  transition-transform duration-150
                  group-hover:scale-105
                `}
                title={platform}
              >
                {config.icon}
              </span>
            );
          })}
        </div>

        {/* Time indicator - subtle, right-aligned */}
        {eventInfo.timeText && (
          <span className="text-2xs font-medium text-neutral-400 tabular-nums">
            {eventInfo.timeText}
          </span>
        )}
      </div>

      {/* Content preview - legible, not cramped */}
      <p
        className={`
          flex-1 min-h-0 text-xs leading-relaxed
          ${style.text}
          line-clamp-2
        `}
      >
        {displayContent}
      </p>

      {/* Bottom row: Status + collaborator avatars */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
            aria-label={`Status: ${post.status.toLowerCase().replace('_', ' ')}`}
          />
          <span className="text-2xs text-neutral-400 capitalize">
            {post.status.toLowerCase().replace('_', ' ')}
          </span>
        </div>
        {post.collaborators && post.collaborators.length > 0 && (
          <div className="flex items-center -space-x-1">
            {post.collaborators.slice(0, 2).map((collab) => (
              <div
                key={collab.userId}
                className="w-4 h-4 rounded-full border border-white bg-neutral-200 flex items-center justify-center overflow-hidden"
                title={collab.user.fullName}
              >
                {collab.user.avatarUrl ? (
                  <img src={collab.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[7px] font-medium text-neutral-500">
                    {collab.user.fullName.charAt(0)}
                  </span>
                )}
              </div>
            ))}
            {post.collaborators.length > 2 && (
              <div className="w-4 h-4 rounded-full border border-white bg-neutral-100 flex items-center justify-center">
                <span className="text-[7px] font-medium text-neutral-400">
                  +{post.collaborators.length - 2}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover overlay - subtle highlight effect */}
      <div
        className="
          absolute inset-0 rounded-md pointer-events-none
          bg-white/0 group-hover:bg-white/10
          transition-colors duration-200
        "
        aria-hidden="true"
      />
    </div>
  );
});

// Export render function for FullCalendar eventContent prop
export function renderCalendarPostCard(eventInfo: EventContentArg) {
  return <CalendarPostCard eventInfo={eventInfo} />;
}

// Platform icons - refined, consistent sizing
function InstagramIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
