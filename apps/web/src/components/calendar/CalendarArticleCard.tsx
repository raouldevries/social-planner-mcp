/**
 * Calendar Article Card
 *
 * Custom event renderer for FullCalendar displaying article cards
 * with a distinct blue color scheme to differentiate from posts.
 *
 * Design principles:
 * - Blue color scheme for visual distinction from posts
 * - Shows article title and status
 * - Day-based planning (all-day events)
 */

import { memo } from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import type { ArticleSummary } from '@social-planner/shared';
import { ARTICLE_STATUS } from '@social-planner/shared';

// Status styling for articles
const statusStyles: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  [ARTICLE_STATUS.DRAFT]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-neutral-400',
  },
  [ARTICLE_STATUS.PUBLISHED]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-green-500',
  },
};

interface CalendarArticleCardProps {
  eventInfo: EventContentArg;
}

/**
 * Memoized article card component for optimal calendar performance.
 * Each card represents an article on the calendar grid.
 */
export const CalendarArticleCard = memo(function CalendarArticleCard({
  eventInfo,
}: CalendarArticleCardProps) {
  const article = eventInfo.event.extendedProps.article as ArticleSummary;

  // Get status styling with guaranteed fallback
  const defaultStyle = {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-neutral-400',
  };
  const style = (article?.status ? statusStyles[article.status] : undefined) ?? defaultStyle;

  // Fallback for missing article data
  if (!article) {
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
    >
      {/* Top row: Article icon */}
      <div className="flex items-center gap-1.5">
        <span
          className="
            flex items-center justify-center w-5 h-5 rounded
            bg-blue-100 text-blue-600
            transition-transform duration-150
            group-hover:scale-105
          "
          title="Article"
        >
          <ArticleIcon />
        </span>
        <span className="text-2xs font-medium text-blue-500">Article</span>
      </div>

      {/* Title */}
      <p
        className={`
          flex-1 min-h-0 text-xs leading-relaxed font-medium
          ${style.text}
          line-clamp-2
        `}
      >
        {article.title}
      </p>

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
          aria-label={`Status: ${article.status.toLowerCase()}`}
        />
        <span className="text-2xs text-blue-500 capitalize">{article.status.toLowerCase()}</span>
      </div>

      {/* Hover overlay */}
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

// Article icon
function ArticleIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
