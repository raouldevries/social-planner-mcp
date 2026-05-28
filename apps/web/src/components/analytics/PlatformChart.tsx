/**
 * Platform Chart
 *
 * Bar chart comparing performance across platforms.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/hooks/useAnalytics';
import type { AnalyticsDashboard } from '@social-planner/shared';

interface PlatformChartProps {
  data: AnalyticsDashboard['byPlatform'];
  loading?: boolean;
}

const PLATFORM_NAMES = {
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
};

export function PlatformChart({ data, loading }: PlatformChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-80 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const chartData = Object.entries(data).map(([platform, metrics]) => ({
    platform: PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES] || platform,
    impressions: metrics?.impressions || 0,
    engagements: metrics?.engagements || 0,
    reach: metrics?.reach || 0,
    clicks: metrics?.clicks || 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No platform data available
        </div>
      </div>
    );
  }

  // Generate accessible summary
  const totalImpressions = chartData.reduce((sum, d) => sum + d.impressions, 0);
  const totalEngagements = chartData.reduce((sum, d) => sum + d.engagements, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
      {/* Accessible summary for screen readers */}
      <p className="sr-only">
        Bar chart comparing platform performance. Total impressions: {totalImpressions.toLocaleString()}.
        Total engagements: {totalEngagements.toLocaleString()}.
        Platforms shown: {chartData.map(d => d.platform).join(', ')}.
      </p>
      <div className="h-80" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="platform"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value, name) => [formatNumber(typeof value === 'number' ? value : 0), name ?? '']}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              iconType="circle"
              formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
            />
            <Bar
              dataKey="impressions"
              name="Impressions"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="engagements"
              name="Engagements"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="clicks"
              name="Clicks"
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
