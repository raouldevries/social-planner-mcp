/**
 * Post Filters
 *
 * Filter controls for the post list - search, status, platform, and date range.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { SOCIAL_PLATFORM, POST_STATUS } from '@social-planner/shared';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';

export interface PostFilterValues {
  search: string;
  status: string;
  platform: string;
  fromDate: string;
  toDate: string;
}

interface PostFiltersProps {
  filters: PostFilterValues;
  onFiltersChange: (filters: PostFilterValues) => void;
  showStatusFilter?: boolean;
}

const platformOptions = [
  { value: '', label: 'All Platforms' },
  { value: SOCIAL_PLATFORM.INSTAGRAM, label: 'Instagram' },
  { value: SOCIAL_PLATFORM.LINKEDIN, label: 'LinkedIn' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: POST_STATUS.DRAFT, label: 'Draft' },
  { value: POST_STATUS.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: POST_STATUS.APPROVED, label: 'Approved' },
  { value: POST_STATUS.REJECTED, label: 'Rejected' },
  { value: POST_STATUS.SCHEDULED, label: 'Scheduled' },
  { value: POST_STATUS.PUBLISHED, label: 'Published' },
  { value: POST_STATUS.UNPUBLISHED, label: 'Unpublished' },
];

export function PostFilters({
  filters,
  onFiltersChange,
  showStatusFilter = true,
}: PostFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const filtersRef = useRef(filters);

  // Keep ref in sync with latest filters
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Sync local state when external filters are cleared
  useEffect(() => {
    if (filters.search === '' && searchInput !== '') {
      setSearchInput('');
    }
  }, [filters.search, searchInput]);

  // Update filters when debounced search changes (use ref to avoid stale closure)
  useEffect(() => {
    if (debouncedSearch !== filtersRef.current.search) {
      onFiltersChange({ ...filtersRef.current, search: debouncedSearch });
    }
  }, [debouncedSearch, onFiltersChange]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    []
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFiltersChange({ ...filters, status: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handlePlatformChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFiltersChange({ ...filters, platform: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleFromDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, fromDate: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleToDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, toDate: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({
      search: '',
      status: '',
      platform: '',
      fromDate: '',
      toDate: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.platform ||
    filters.fromDate ||
    filters.toDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="post-filter-search"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Search
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="post-filter-search"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search posts..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Status filter (optional) */}
        {showStatusFilter && (
          <div className="w-40">
            <label
              htmlFor="post-filter-status"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Status
            </label>
            <Select
              id="post-filter-status"
              value={filters.status}
              onChange={handleStatusChange}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Platform filter */}
        <div className="w-36">
          <label
            htmlFor="post-filter-platform"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Platform
          </label>
          <Select
            id="post-filter-platform"
            value={filters.platform}
            onChange={handlePlatformChange}
          >
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Date range */}
        <div className="w-36">
          <label
            htmlFor="post-filter-from-date"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            From
          </label>
          <Input
            id="post-filter-from-date"
            type="date"
            value={filters.fromDate}
            onChange={handleFromDateChange}
          />
        </div>

        <div className="w-36">
          <label
            htmlFor="post-filter-to-date"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            To
          </label>
          <Input
            id="post-filter-to-date"
            type="date"
            value={filters.toDate}
            onChange={handleToDateChange}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// Icons
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
