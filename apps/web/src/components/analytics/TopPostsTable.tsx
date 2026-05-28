/**
 * Top Posts Table
 *
 * Sortable table showing top performing posts.
 */

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { formatPercentage } from '@/hooks/useAnalytics';
import type { AnalyticsDashboard } from '@social-planner/shared';

interface TopPostsTableProps {
  data: AnalyticsDashboard['topPosts'];
  loading?: boolean;
}

type SortField = 'content' | 'platform' | 'engagementRate';
type SortOrder = 'asc' | 'desc';

const PLATFORM_STYLES = {
  INSTAGRAM: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    label: 'Instagram',
  },
  LINKEDIN: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    label: 'LinkedIn',
  },
};

export function TopPostsTable({ data, loading }: TopPostsTableProps) {
  const [sortField, setSortField] = useState<SortField>('engagementRate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'content':
          comparison = a.content.localeCompare(b.content);
          break;
        case 'platform':
          comparison = a.platform.localeCompare(b.platform);
          break;
        case 'engagementRate':
          comparison = a.engagementRate - b.engagementRate;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortOrder]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Posts</h3>
        <div className="h-40 flex items-center justify-center text-gray-500">
          No published posts found
        </div>
      </div>
    );
  }

  // Helper to get aria-sort value
  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 id="top-posts-heading" className="text-lg font-semibold text-gray-900">Top Performing Posts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" aria-labelledby="top-posts-heading">
          <caption className="sr-only">
            Top performing posts sorted by {sortField === 'content' ? 'post content' : sortField === 'platform' ? 'platform' : 'engagement rate'},
            {sortOrder === 'asc' ? ' ascending' : ' descending'}
          </caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left" aria-sort={getAriaSort('content')}>
                <button
                  type="button"
                  onClick={() => handleSort('content')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  aria-label={`Sort by post content, currently ${getAriaSort('content')}`}
                >
                  Post
                  <SortIcon active={sortField === 'content'} order={sortOrder} />
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left" aria-sort={getAriaSort('platform')}>
                <button
                  type="button"
                  onClick={() => handleSort('platform')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  aria-label={`Sort by platform, currently ${getAriaSort('platform')}`}
                >
                  Platform
                  <SortIcon active={sortField === 'platform'} order={sortOrder} />
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-right" aria-sort={getAriaSort('engagementRate')}>
                <button
                  type="button"
                  onClick={() => handleSort('engagementRate')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 ml-auto"
                  aria-label={`Sort by engagement rate, currently ${getAriaSort('engagementRate')}`}
                >
                  Engagement Rate
                  <SortIcon active={sortField === 'engagementRate'} order={sortOrder} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((post, index) => {
              const platformStyle = PLATFORM_STYLES[post.platform as keyof typeof PLATFORM_STYLES] || {
                bg: 'bg-gray-50',
                text: 'text-gray-700',
                label: post.platform,
              };

              return (
                <tr key={post.postId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <p className="text-sm text-gray-900 truncate max-w-md" title={post.content}>
                        {post.content}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        platformStyle.bg,
                        platformStyle.text
                      )}
                    >
                      {platformStyle.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPercentage(post.engagementRate)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg
      className={clsx('w-4 h-4', active ? 'text-gray-700' : 'text-gray-400')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {active && order === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      ) : active && order === 'desc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      )}
    </svg>
  );
}
