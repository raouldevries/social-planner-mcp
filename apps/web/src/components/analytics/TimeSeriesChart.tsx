/**
 * Time Series Chart
 *
 * Line chart showing metrics over time.
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatNumber } from '@/hooks/useAnalytics';
import type { AnalyticsDashboard } from '@social-planner/shared';

interface TimeSeriesChartProps {
  data: AnalyticsDashboard['timeSeries'];
  loading?: boolean;
}

export function TimeSeriesChart({ data, loading }: TimeSeriesChartProps) {
  // Memoize chart data transformation - must be before any early returns
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      dateFormatted: format(parseISO(item.date), 'MMM d'),
    }));
  }, [data]);

  // Calculate summary for accessibility - must be before any early returns
  const accessibleSummary = useMemo(() => {
    if (data.length === 0) return null;
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const totalEngagements = data.reduce((sum, d) => sum + d.engagements, 0);
    const firstDate = data[0];
    const lastDate = data[data.length - 1];
    const dateRange = firstDate && lastDate
      ? `from ${format(parseISO(firstDate.date), 'MMM d')} to ${format(parseISO(lastDate.date), 'MMM d')}`
      : '';
    return { totalImpressions, totalEngagements, dateRange, days: data.length };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-80 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h3>
      {/* Accessible summary for screen readers */}
      {accessibleSummary && (
        <p className="sr-only">
          Line chart showing trends over {accessibleSummary.days} days {accessibleSummary.dateRange}.
          Total impressions: {accessibleSummary.totalImpressions.toLocaleString()}.
          Total engagements: {accessibleSummary.totalEngagements.toLocaleString()}.
        </p>
      )}
      <div className="h-80" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#E5E7EB' }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
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
              labelFormatter={(label) => `Date: ${label}`}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              iconType="circle"
              formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#3B82F6' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagements"
              name="Engagements"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#10B981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
