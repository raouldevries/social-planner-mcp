/**
 * Metrics Cards
 *
 * Displays aggregate analytics metrics in a row of cards.
 */

import { clsx } from 'clsx';
import { formatNumber, formatPercentage } from '@/hooks/useAnalytics';
import type { PostAnalyticsSummary } from '@social-planner/shared';

interface MetricsCardsProps {
  data: PostAnalyticsSummary;
  postsCount: number;
  loading?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({ label, value, sublabel, icon, loading }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div
              className="mt-2 h-8 w-24 bg-gray-200 rounded animate-pulse"
              role="status"
              aria-label={`Loading ${label}`}
            />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}
          {sublabel && !loading && (
            <p className="mt-1 text-sm text-gray-500">{sublabel}</p>
          )}
        </div>
        <div
          className={clsx(
            'p-3 rounded-lg',
            loading ? 'bg-gray-100' : 'bg-primary-50 text-primary-600'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function MetricsCards({ data, postsCount, loading }: MetricsCardsProps) {
  const isLoading = loading ?? false;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Impressions"
        value={formatNumber(data.impressions)}
        sublabel={`${formatNumber(data.reach)} reach`}
        icon={<EyeIcon className="w-6 h-6" />}
        loading={isLoading}
      />
      <MetricCard
        label="Total Engagements"
        value={formatNumber(data.engagements)}
        sublabel={`${formatNumber(data.likes)} likes`}
        icon={<HeartIcon className="w-6 h-6" />}
        loading={isLoading}
      />
      <MetricCard
        label="Avg Engagement Rate"
        value={formatPercentage(data.engagementRate)}
        sublabel="engagements / impressions"
        icon={<ChartIcon className="w-6 h-6" />}
        loading={isLoading}
      />
      <MetricCard
        label="Posts Analyzed"
        value={postsCount.toString()}
        sublabel="published posts"
        icon={<DocumentIcon className="w-6 h-6" />}
        loading={isLoading}
      />
    </div>
  );
}

// Icons (decorative - aria-hidden handled by parent container)
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}
