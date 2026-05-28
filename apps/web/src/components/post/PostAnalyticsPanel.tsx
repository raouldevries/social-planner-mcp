/**
 * Post Analytics Panel Component
 *
 * StoryChief-style performance summary showing per-channel breakdown
 * for engagement rate, engagements, and impressions.
 */

import { clsx } from 'clsx';
import {
  usePostAnalytics,
  useSyncPostAnalytics,
  formatNumber,
  formatPercentage,
} from '@/hooks/useAnalytics';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { ChannelAnalyticsSummary, SocialPlatform } from '@social-planner/shared';

// ============================================
// TYPES
// ============================================

interface PostAnalyticsPanelProps {
  postId: string;
}

interface MetricSectionProps {
  title: string;
  totalValue: string;
  channels: ChannelAnalyticsSummary[];
  metricKey: 'engagementRate' | 'engagements' | 'impressions';
  color: 'green' | 'blue' | 'orange';
}

interface ChannelMetricRowProps {
  channel: ChannelAnalyticsSummary;
  value: number;
  maxValue: number;
  color: 'green' | 'blue' | 'orange';
  isPercentage?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPlatformIcon(platform: SocialPlatform) {
  if (platform === 'INSTAGRAM') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }

  // LinkedIn
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function getProgressBarColor(color: 'green' | 'blue' | 'orange'): string {
  switch (color) {
    case 'green':
      return 'bg-green-500';
    case 'blue':
      return 'bg-blue-500';
    case 'orange':
      return 'bg-orange-400';
    default:
      return 'bg-gray-400';
  }
}

function getPlatformColor(platform: SocialPlatform): string {
  return platform === 'INSTAGRAM' ? 'text-pink-600' : 'text-blue-700';
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ChannelMetricRow({
  channel,
  value,
  maxValue,
  color,
  isPercentage,
}: ChannelMetricRowProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const displayValue = isPercentage ? formatPercentage(value) : value.toLocaleString();

  return (
    <div className="flex items-center gap-3">
      <div className={clsx('flex-shrink-0', getPlatformColor(channel.platform))}>
        {getPlatformIcon(channel.platform)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 truncate">{channel.accountName}</span>
          <span className="text-sm font-medium text-gray-900 ml-2">{displayValue}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              getProgressBarColor(color)
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricSection({ title, totalValue, channels, metricKey, color }: MetricSectionProps) {
  // Find max value for progress bar scaling
  const maxValue = Math.max(
    ...channels.map((c) => {
      if (metricKey === 'engagementRate') return c.metrics.engagementRate;
      if (metricKey === 'engagements') return c.metrics.engagements;
      return c.metrics.impressions;
    }),
    1
  );

  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
        <span className="text-xl font-bold text-gray-900">{totalValue}</span>
      </div>
      <div className="space-y-3">
        {channels.map((channel) => {
          const value =
            metricKey === 'engagementRate'
              ? channel.metrics.engagementRate
              : metricKey === 'engagements'
                ? channel.metrics.engagements
                : channel.metrics.impressions;

          return (
            <ChannelMetricRow
              key={channel.channelId}
              channel={channel}
              value={value}
              maxValue={maxValue}
              color={color}
              isPercentage={metricKey === 'engagementRate'}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PostAnalyticsPanel({ postId }: PostAnalyticsPanelProps) {
  const { data: analytics, isLoading, isError } = usePostAnalytics(postId);
  const { mutate: syncAnalytics, isPending: isSyncing } = useSyncPostAnalytics();

  const handlePrint = () => {
    window.print();
  };

  const handleSync = () => {
    syncAnalytics(postId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg
          className="w-12 h-12 mb-3 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">No analytics data available yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Analytics will appear after the post is published
        </p>
      </div>
    );
  }

  const { aggregate, byChannel, syncedAt } = analytics;

  // If no channels, show empty state
  if (byChannel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg
          className="w-12 h-12 mb-3 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">Performance summary</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Spinner size="sm" /> : <RefreshIcon />}
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <PrintIcon />
            Print
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4">
        <MetricSection
          title="Engagement Rate"
          totalValue={formatPercentage(aggregate.engagementRate)}
          channels={byChannel}
          metricKey="engagementRate"
          color="green"
        />

        <MetricSection
          title="Engagements"
          totalValue={formatNumber(aggregate.engagements)}
          channels={byChannel}
          metricKey="engagements"
          color="blue"
        />

        <MetricSection
          title="Impressions"
          totalValue={formatNumber(aggregate.impressions)}
          channels={byChannel}
          metricKey="impressions"
          color="orange"
        />
      </div>

      {/* Sync timestamp */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">Last updated: {new Date(syncedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function RefreshIcon() {
  return (
    <svg
      className="w-4 h-4 mr-1.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      className="w-4 h-4 mr-1.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
      />
    </svg>
  );
}
