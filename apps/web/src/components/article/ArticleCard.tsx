/**
 * Article Card
 *
 * Displays an article summary in list views with title, status, author, and dates.
 * Design aligned with PostCard for visual consistency.
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { ARTICLE_STATUS, type ArticleSummary } from '@social-planner/shared';

interface ArticleCardProps {
  article: ArticleSummary;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const isPublished = article.status === ARTICLE_STATUS.PUBLISHED;

  return (
    <Link
      to={`/articles/${article.id}`}
      className="block bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all duration-150"
    >
      <div className="flex gap-4 p-4">
        {/* Featured image */}
        <div className="flex-shrink-0">
          {article.featuredImageUrl ? (
            <img
              src={article.featuredImageUrl}
              alt={`Featured image for ${article.title}`}
              className="w-20 h-20 rounded-lg object-cover bg-neutral-100"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-lg bg-neutral-100 flex items-center justify-center"
              aria-hidden="true"
            >
              <ArticleIcon className="w-8 h-8 text-neutral-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base font-medium text-neutral-900 line-clamp-2">{article.title}</h3>
            <span
              className={clsx(
                'flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium',
                isPublished ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-3">
              {/* Author */}
              <span className="flex items-center gap-1">
                {article.author.avatarUrl ? (
                  <img
                    src={article.author.avatarUrl}
                    alt={article.author.fullName}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-neutral-300 flex items-center justify-center text-[8px] text-white font-medium">
                    {article.author.fullName.charAt(0)}
                  </div>
                )}
                {article.author.fullName}
              </span>

              {/* Date */}
              <span>
                {article.publishedAt
                  ? `Published: ${format(new Date(article.publishedAt), 'MMM d, yyyy')}`
                  : `Updated: ${format(new Date(article.updatedAt), 'MMM d, yyyy')}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Icons
function ArticleIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
