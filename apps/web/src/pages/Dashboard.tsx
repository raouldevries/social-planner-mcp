/**
 * Social Planner - Dashboard Page
 *
 * Main dashboard with Apple-inspired design showing post statistics,
 * recent activity, and upcoming posts.
 *
 * Design principles:
 * - Clean, minimal layout with purposeful whitespace
 * - Subtle card shadows that don't compete for attention
 * - Typography hierarchy guides the eye naturally
 * - Interactive elements respond with subtle animations
 */

import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useUser } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow, format } from 'date-fns';
import {
  useDashboard,
  getActionDisplayText,
  getPlatformDisplayName,
  getPlatformColor,
  type RecentActivity,
  type UpcomingPost,
} from '@/hooks/useDashboard';

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: number;
  dotColor?: string;
  href?: string;
}

function StatCard({ label, value, dotColor, href }: StatCardProps) {
  const content = (
    <Card interactive={!!href} className="group">
      <div className="flex items-center gap-2 mb-2">
        {dotColor && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        )}
        <span className="text-sm font-medium text-neutral-500">{label}</span>
      </div>
      <div className="text-3xl font-semibold text-neutral-900 tracking-tight">{value}</div>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// ============================================
// ACTIVITY ITEM COMPONENT
// ============================================

interface ActivityItemProps {
  activity: RecentActivity;
}

const ActivityItem = memo(function ActivityItem({ activity }: ActivityItemProps) {
  const actionText = getActionDisplayText(activity.action);
  const postContent = activity.post?.baseContent ?? '';
  const targetName = activity.post
    ? postContent.slice(0, 50) + (postContent.length > 50 ? '...' : '')
    : activity.article
      ? activity.article.title
      : null;

  const initials = activity.actor.fullName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-neutral-100 last:border-0">
      {activity.actor.avatarUrl ? (
        <img src={activity.actor.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div
          className={clsx(
            'w-9 h-9 rounded-full',
            'bg-gradient-to-br from-neutral-200 to-neutral-300',
            'flex items-center justify-center'
          )}
        >
          <span className="text-xs font-medium text-neutral-600">{initials}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900">
          <span className="font-medium">{activity.actor.fullName || 'Unknown'}</span>{' '}
          <span className="text-neutral-500">{actionText}</span>
        </p>
        {targetName && <p className="text-sm text-neutral-500 truncate mt-0.5">{targetName}</p>}
        <p className="text-xs text-neutral-400 mt-1.5">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
});

// ============================================
// UPCOMING POST COMPONENT
// ============================================

interface UpcomingPostItemProps {
  post: UpcomingPost;
}

const UpcomingPostItem = memo(function UpcomingPostItem({ post }: UpcomingPostItemProps) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className={clsx(
        'block py-3.5 -mx-5 px-5',
        'border-b border-neutral-100 last:border-0',
        'transition-colors duration-150',
        'hover:bg-neutral-50 active:bg-neutral-100'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-900 line-clamp-2 leading-relaxed">
            {post.baseContent ?? <span className="text-neutral-400 italic">No content</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {post.channels.map((channel) => (
              <span
                key={`${channel.platform}-${channel.accountName}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${getPlatformColor(channel.platform)}15`,
                  color: getPlatformColor(channel.platform),
                }}
              >
                {getPlatformDisplayName(channel.platform)}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-neutral-900">
            {format(new Date(post.scheduledAt), 'MMM d')}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {format(new Date(post.scheduledAt), 'h:mm a')}
          </p>
        </div>
      </div>
    </Link>
  );
});

// ============================================
// SUMMARY STAT COMPONENT
// ============================================

interface SummaryStatProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function SummaryStat({ value, label, icon, iconBg, iconColor }: SummaryStatProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-semibold text-neutral-900 tracking-tight">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// ICONS
// ============================================

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function Dashboard() {
  const user = useUser();
  const { data, isLoading, isError, refetch } = useDashboard();

  const stats = data?.postStats;
  const recentActivity = useMemo(() => data?.recentActivity ?? [], [data?.recentActivity]);
  const upcomingPosts = useMemo(() => data?.upcomingPosts ?? [], [data?.upcomingPosts]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-label="Loading dashboard"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64" role="alert">
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
        <p className="text-neutral-600 mb-4">Failed to load dashboard data</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div
        className="mb-8"
        data-feedback-target="dashboard-header"
        data-feedback-label="Dashboard Header"
      >
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
          Welcome back, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-neutral-500 mt-1">Here&apos;s an overview of your content planning.</p>
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        data-feedback-target="dashboard-stats"
        data-feedback-label="Post Statistics"
      >
        <StatCard
          label="Drafts"
          value={stats?.draft ?? 0}
          dotColor="#a3a3a3"
          href="/posts?status=DRAFT"
        />
        <StatCard
          label="Pending Approval"
          value={stats?.pendingApproval ?? 0}
          dotColor="#f59e0b"
          href="/posts?status=PENDING_APPROVAL"
        />
        <StatCard
          label="Scheduled"
          value={stats?.scheduled ?? 0}
          dotColor="#8b5cf6"
          href="/posts?status=SCHEDULED"
        />
        <StatCard
          label="Published"
          value={stats?.published ?? 0}
          dotColor="#22c55e"
          href="/posts?status=PUBLISHED"
        />
      </div>

      {/* Summary Stats Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        data-feedback-target="dashboard-summary"
        data-feedback-label="Weekly Summary"
      >
        <SummaryStat
          value={data?.publishedThisWeek ?? 0}
          label="Published this week"
          icon={<CheckIcon />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <SummaryStat
          value={data?.pendingApprovalCount ?? 0}
          label="Awaiting approval"
          icon={<ClockIcon />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <SummaryStat
          value={stats?.total ?? 0}
          label="Total posts"
          icon={<ChartIcon />}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <Card data-feedback-target="dashboard-activity" data-feedback-label="Recent Activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-neutral-500 text-sm py-8 text-center">No recent activity</p>
          ) : (
            <div className="-mt-1">
              {recentActivity.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Posts */}
        <Card data-feedback-target="dashboard-upcoming" data-feedback-label="Upcoming Posts">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Upcoming Posts</h2>
            <Link
              to="/calendar"
              className={clsx(
                'text-sm font-medium',
                'text-primary-600 hover:text-primary-700',
                'transition-colors duration-150'
              )}
            >
              View Calendar
            </Link>
          </div>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500 text-sm mb-4">No upcoming scheduled posts</p>
              <Link to="/posts/new">
                <Button variant="secondary" size="sm">
                  Create Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="-mt-1">
              {upcomingPosts.map((post) => (
                <UpcomingPostItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-feedback-target="dashboard-actions" data-feedback-label="Quick Actions">
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/posts/new">
            <Button variant="primary" leftIcon={<PlusIcon />}>
              Create Post
            </Button>
          </Link>
          <Link to="/articles/new">
            <Button variant="secondary" leftIcon={<DocumentIcon />}>
              Write Article
            </Button>
          </Link>
          <Link to="/media">
            <Button variant="ghost" leftIcon={<ImageIcon />}>
              Upload Media
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
