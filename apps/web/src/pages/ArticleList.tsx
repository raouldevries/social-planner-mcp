/**
 * Article List Page
 *
 * Displays articles in a sortable, searchable list with status filtering and pagination.
 * Design aligned with PostList for visual consistency across the application.
 *
 * Design principles:
 * - Pill-shaped tab controls for clear active state
 * - Clean grid layout with consistent spacing
 * - Subtle shadows and transitions throughout
 * - Empty states that guide users naturally
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ARTICLE_STATUS } from '@social-planner/shared';
import { useArticles, type ArticleFilters } from '@/hooks/useArticle';
import { ArticleCard } from '@/components/article';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import { clsx } from 'clsx';

type TabId = 'all' | 'drafts' | 'published';

interface Tab {
  id: TabId;
  label: string;
  status: string | null;
}

const tabs: Tab[] = [
  { id: 'all', label: 'All', status: null },
  { id: 'drafts', label: 'Drafts', status: ARTICLE_STATUS.DRAFT },
  { id: 'published', label: 'Published', status: ARTICLE_STATUS.PUBLISHED },
];

export function ArticleList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL or default to 'all'
  const tabParam = searchParams.get('tab');
  const currentTab: TabId = tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'all';

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  // Local state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Get current tab's status filter
  const currentTabStatus = useMemo(() => {
    const tab = tabs.find((t) => t.id === currentTab);
    return tab?.status || undefined;
  }, [currentTab]);

  // Build query params
  const queryParams = useMemo((): ArticleFilters => {
    return {
      status: currentTabStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      perPage: 20,
    };
  }, [currentTabStatus, debouncedSearch, currentPage]);

  // Fetch articles
  const { data, isLoading, isError, refetch } = useArticles(queryParams);

  // Sync search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (debouncedSearch !== (searchParams.get('search') || '')) {
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      changed = true;
    }

    if (changed) {
      setSearchParams(params);
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleTabChange = useCallback(
    (tabId: TabId) => {
      const params = new URLSearchParams();
      params.set('tab', tabId);
      params.set('page', '1');
      if (searchInput) {
        params.set('search', searchInput);
      }
      setSearchParams(params);
    },
    [searchInput, setSearchParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', String(page));
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const handleNewArticle = useCallback(() => {
    navigate('/articles/new');
  }, [navigate]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Derived state
  const articles = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const hasActiveSearch = !!searchInput;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        data-feedback-target="articles-header"
        data-feedback-label="Articles Header"
      >
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Articles</h1>
        <Button onClick={handleNewArticle} leftIcon={<PlusIcon />}>
          New Article
        </Button>
      </div>

      {/* Tabs - pill-shaped segment control */}
      <div
        className="flex p-1 bg-neutral-100 rounded-xl w-fit"
        data-feedback-target="articles-tabs"
        data-feedback-label="Article Status Tabs"
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

      {/* Search filter */}
      <div
        className="bg-white rounded-lg border border-neutral-200 p-4"
        data-feedback-target="articles-search"
        data-feedback-label="Article Search"
      >
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="article-search"
              className="block text-xs font-medium text-neutral-500 mb-1"
            >
              Search
            </label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                id="article-search"
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search articles..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Clear search */}
          {hasActiveSearch && (
            <Button variant="ghost" size="sm" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>
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
          <p className="text-neutral-600 mb-4">Failed to load articles</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : articles.length === 0 ? (
        <EmptyState tab={currentTab} onNewArticle={handleNewArticle} hasSearch={hasActiveSearch} />
      ) : (
        <>
          {/* Article grid */}
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-feedback-target="articles-grid"
            data-feedback-label="Article Grid"
          >
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              data-feedback-target="articles-pagination"
              data-feedback-label="Article Pagination"
            >
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
  onNewArticle: () => void;
  hasSearch: boolean;
}

function EmptyState({ tab, onNewArticle, hasSearch }: EmptyStateProps) {
  const messages: Record<TabId, { title: string; description: string }> = {
    all: {
      title: 'No articles yet',
      description: 'Create your first article to get started.',
    },
    drafts: {
      title: 'No drafts',
      description: 'Articles you save as drafts will appear here.',
    },
    published: {
      title: 'No published articles',
      description: 'Your published articles will appear here.',
    },
  };

  const { title, description } = hasSearch
    ? { title: 'No articles found', description: 'Try adjusting your search.' }
    : messages[tab];

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <ArticleIcon className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-5 max-w-xs">{description}</p>
      {tab === 'all' && !hasSearch && (
        <Button onClick={onNewArticle} leftIcon={<PlusIcon />}>
          Create Article
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
        aria-label="Go to previous page"
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
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
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
        aria-label="Go to next page"
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

function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

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
