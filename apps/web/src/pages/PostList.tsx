/**
 * Post List Page
 *
 * Tabbed views for browsing posts with Apple-inspired design.
 * Features refined tabs, subtle animations, and clean grid layout.
 *
 * Design principles:
 * - Pill-shaped tab controls for clear active state
 * - Clean grid layout with consistent spacing
 * - Subtle shadows and transitions throughout
 * - Empty states that guide users naturally
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { POST_STATUS } from '@social-planner/shared';
import { usePosts, type PostFilters as PostFilterParams } from '@/hooks/usePost';
import { PostCard, PostFilters, type PostFilterValues } from '@/components/post';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type TabId = 'all' | 'drafts' | 'pending' | 'scheduled' | 'published';

interface Tab {
  id: TabId;
  label: string;
  statuses: string[];
}

const tabs: Tab[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'drafts', label: 'Drafts', statuses: [POST_STATUS.DRAFT, POST_STATUS.REJECTED] },
  { id: 'pending', label: 'Pending', statuses: [POST_STATUS.PENDING_APPROVAL] },
  {
    id: 'scheduled',
    label: 'Scheduled',
    statuses: [POST_STATUS.APPROVED, POST_STATUS.SCHEDULED],
  },
  {
    id: 'published',
    label: 'Published',
    statuses: [POST_STATUS.PUBLISHED, POST_STATUS.UNPUBLISHED],
  },
];

const defaultFilters: PostFilterValues = {
  search: '',
  status: '',
  platform: '',
  fromDate: '',
  toDate: '',
};

export function PostList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL or default to 'all'
  const tabParam = searchParams.get('tab');
  const currentTab: TabId = tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local filter state
  const [filters, setFilters] = useState<PostFilterValues>(defaultFilters);

  // Get current tab's allowed statuses
  const currentTabStatuses = useMemo(() => {
    const tab = tabs.find((t) => t.id === currentTab);
    return tab?.statuses || [];
  }, [currentTab]);

  // Build query params
  const queryParams = useMemo((): PostFilterParams => {
    return {
      status: filters.status || undefined,
      platform: filters.platform || undefined,
      search: filters.search || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      page: currentPage,
      perPage: 20,
    };
  }, [filters, currentPage]);

  // Fetch posts
  const { data, isLoading, isError, refetch } = usePosts(queryParams);

  // Client-side filter posts by tab statuses
  const filteredPosts = useMemo(() => {
    const allPosts = data?.data || [];
    if (currentTabStatuses.length === 0 || filters.status) {
      return allPosts;
    }
    return allPosts.filter((post) => currentTabStatuses.includes(post.status));
  }, [data?.data, currentTabStatuses, filters.status]);

  // Handlers
  const handleTabChange = useCallback(
    (tabId: TabId) => {
      setSearchParams({ tab: tabId, page: '1' });
    },
    [setSearchParams]
  );

  const handleFiltersChange = useCallback(
    (newFilters: PostFilterValues) => {
      setFilters(newFilters);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('page', '1');
        return params;
      });
    },
    [setSearchParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', String(page));
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const handleNewPost = useCallback(() => {
    navigate('/posts/new', { state: { from: 'posts' } });
  }, [navigate]);

  // Derived state
  const totalPages = data?.pagination?.totalPages || 1;
  const showStatusFilter = currentTab === 'all';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        data-feedback-target="posts-header"
        data-feedback-label="Posts Header"
      >
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Posts</h1>
        <Button onClick={handleNewPost} leftIcon={<PlusIcon />}>
          New Post
        </Button>
      </div>

      {/* Tabs - pill-shaped segment control */}
      <div
        className="flex p-1 bg-neutral-100 rounded-xl w-fit"
        data-feedback-target="posts-tabs"
        data-feedback-label="Post Status Tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'transition-all duration-200 ease-out',
              currentTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div data-feedback-target="posts-filters" data-feedback-label="Post Filters">
        <PostFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showStatusFilter={showStatusFilter}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-neutral-600 mb-4">Failed to load posts</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState tab={currentTab} onNewPost={handleNewPost} />
      ) : (
        <>
          {/* Post grid */}
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-feedback-target="posts-grid"
            data-feedback-label="Post Grid"
          >
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} from="posts" />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div data-feedback-target="posts-pagination" data-feedback-label="Post Pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  tab: TabId;
  onNewPost: () => void;
}

function EmptyState({ tab, onNewPost }: EmptyStateProps) {
  const messages: Record<TabId, { title: string; description: string }> = {
    all: {
      title: 'No posts yet',
      description: 'Create your first post to get started.',
    },
    drafts: {
      title: 'No drafts',
      description: 'Posts you save as drafts will appear here.',
    },
    pending: {
      title: 'No pending posts',
      description: 'Posts awaiting approval will appear here.',
    },
    scheduled: {
      title: 'No scheduled posts',
      description: 'Approved posts ready to be scheduled will appear here.',
    },
    published: {
      title: 'No published posts',
      description: 'Your published posts will appear here.',
    },
  };

  const { title, description } = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <EmptyIcon className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-5 max-w-xs">{description}</p>
      {tab === 'all' && (
        <Button onClick={onNewPost} leftIcon={<PlusIcon />}>
          Create Post
        </Button>
      )}
    </div>
  );
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        result.push(i);
      }
    } else {
      result.push(1);

      if (currentPage > 3) {
        result.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        result.push(i);
      }

      if (currentPage < totalPages - 2) {
        result.push('ellipsis');
      }

      if (totalPages > 1) {
        result.push(totalPages);
      }
    }

    return result;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={clsx(
          'p-2.5 rounded-lg',
          'text-neutral-500 hover:text-neutral-700',
          'hover:bg-neutral-100 active:bg-neutral-200',
          'transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
        )}
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              'w-9 h-9 rounded-lg text-sm font-medium',
              'transition-all duration-150',
              currentPage === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200'
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={clsx(
          'p-2.5 rounded-lg',
          'text-neutral-500 hover:text-neutral-700',
          'hover:bg-neutral-100 active:bg-neutral-200',
          'transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
        )}
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Icons
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
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
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
