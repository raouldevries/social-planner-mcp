/**
 * Analytics Dashboard Page
 *
 * Displays performance metrics, charts, and top posts.
 */

import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MetricsCards,
  PlatformChart,
  TimeSeriesChart,
  TopPostsTable,
  DateRangeSelector,
} from '@/components/analytics';
import { Button } from '@/components/ui/Button';
import {
  useAnalyticsDashboard,
  getDateRangeFromPreset,
  type DateRangePreset,
  type AnalyticsFilters,
} from '@/hooks/useAnalytics';
import type { SocialPlatform } from '@social-planner/shared';
import { clsx } from 'clsx';

// Default empty metrics (defined outside component to avoid recreation)
const EMPTY_METRICS = {
  impressions: 0,
  reach: 0,
  engagements: 0,
  engagementRate: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
};

type PlatformFilter = 'all' | SocialPlatform;

export function Analytics() {
  // State
  const [preset, setPreset] = useState<DateRangePreset>('last30days');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  // Calculate date range
  const dateRange = useMemo(() => {
    if (preset === 'custom' && customRange) {
      return {
        from: new Date(customRange.from),
        to: new Date(customRange.to),
      };
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customRange]);

  // Build filters
  const filters = useMemo((): AnalyticsFilters => {
    const baseFilters: AnalyticsFilters = {
      fromDate: format(dateRange.from, 'yyyy-MM-dd'),
      toDate: format(dateRange.to, 'yyyy-MM-dd'),
    };
    if (platformFilter !== 'all') {
      baseFilters.platform = platformFilter;
    }
    return baseFilters;
  }, [dateRange, platformFilter]);

  // Fetch data
  const { data, isLoading, isError, refetch } = useAnalyticsDashboard(filters);

  // Handlers
  const handlePresetChange = useCallback((newPreset: DateRangePreset) => {
    setPreset(newPreset);
    setCustomRange(null);
  }, []);

  const handleCustomRangeChange = useCallback((from: string, to: string) => {
    setPreset('custom');
    setCustomRange({ from, to });
  }, []);

  const handleExport = useCallback(() => {
    // TODO: Implement PDF export
    toast('Export feature will be available when the backend analytics API is ready.', {
      icon: 'ℹ️',
      duration: 4000,
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        data-feedback-target="analytics-header"
        data-feedback-label="Analytics Header"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Track your social media performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <PrintIcon className="w-4 h-4 mr-2" aria-hidden="true" />
            Print
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport}>
            <ExportIcon className="w-4 h-4 mr-2" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="bg-white rounded-xl border border-neutral-200 p-4"
        data-feedback-target="analytics-filters"
        data-feedback-label="Analytics Filters"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <DateRangeSelector
            preset={preset}
            fromDate={filters.fromDate}
            toDate={filters.toDate}
            onPresetChange={handlePresetChange}
            onCustomRangeChange={handleCustomRangeChange}
          />

          {/* Platform Switcher */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={clsx(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] whitespace-nowrap',
                platformFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('INSTAGRAM')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] whitespace-nowrap',
                platformFilter === 'INSTAGRAM'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              <InstagramIcon className="w-4 h-4" />
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('LINKEDIN')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] whitespace-nowrap',
                platformFilter === 'LINKEDIN'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              <LinkedInIcon className="w-4 h-4" />
              LinkedIn
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div
          className="flex flex-col items-center justify-center h-64 text-neutral-500"
          role="alert"
          aria-live="assertive"
        >
          <p className="mb-4">Failed to load analytics</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Loading or Content */}
      {!isError && (
        <>
          {/* Metrics Cards */}
          <div data-feedback-target="analytics-metrics" data-feedback-label="Performance Metrics">
            <MetricsCards
              data={data?.aggregate || EMPTY_METRICS}
              postsCount={data?.topPosts.length || 0}
              loading={isLoading}
            />
          </div>

          {/* Charts Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            data-feedback-target="analytics-charts"
            data-feedback-label="Performance Charts"
          >
            <PlatformChart data={data?.byPlatform || {}} loading={isLoading} />
            <TimeSeriesChart data={data?.timeSeries || []} loading={isLoading} />
          </div>

          {/* Top Posts Table */}
          <div data-feedback-target="analytics-top-posts" data-feedback-label="Top Posts">
            <TopPostsTable data={data?.topPosts || []} loading={isLoading} />
          </div>
        </>
      )}
    </div>
  );
}

// Icons
function PrintIcon({ className }: { className?: string }) {
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
        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
      />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}
