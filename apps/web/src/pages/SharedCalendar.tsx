/**
 * Shared Calendar Page (Public)
 *
 * Public page for external reviewers to view and provide feedback on posts.
 * Accessible via share link token, supports password protection.
 *
 * Design principles:
 * - Welcoming, clear purpose for external reviewers
 * - Strong visual hierarchy guiding attention to actionable items
 * - Status-coded visual indicators matching internal app patterns
 * - Smooth animations for state transitions
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventClickArg } from '@fullcalendar/core';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

import {
  useShareLinkMeta,
  useShareLinkAccess,
  useShareLinkVerify,
  useExternalComment,
  useExternalApproval,
  type SharedPostData,
} from '@/hooks/useShareLink';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';

type ViewMode = 'calendar' | 'list';

// Status configuration matching the app's design system
const STATUS_CONFIG: Record<
  string,
  { label: string; borderColor: string; bgColor: string; textColor: string; dotColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    borderColor: 'border-l-neutral-400',
    bgColor: 'bg-status-draft-bg',
    textColor: 'text-status-draft-text',
    dotColor: 'bg-status-draft-dot',
  },
  PENDING_APPROVAL: {
    label: 'Needs Review',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-status-pending-bg',
    textColor: 'text-status-pending-text',
    dotColor: 'bg-status-pending-dot',
  },
  APPROVED: {
    label: 'Approved',
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-status-approved-bg',
    textColor: 'text-status-approved-text',
    dotColor: 'bg-status-approved-dot',
  },
  SCHEDULED: {
    label: 'Scheduled',
    borderColor: 'border-l-violet-500',
    bgColor: 'bg-status-scheduled-bg',
    textColor: 'text-status-scheduled-text',
    dotColor: 'bg-status-scheduled-dot',
  },
  PUBLISHED: {
    label: 'Published',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-status-published-bg',
    textColor: 'text-status-published-text',
    dotColor: 'bg-status-published-dot',
  },
  REJECTED: {
    label: 'Changes Requested',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-status-rejected-bg',
    textColor: 'text-status-rejected-text',
    dotColor: 'bg-status-rejected-dot',
  },
};

export function SharedCalendar() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? undefined;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Password state
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Query share link metadata
  const {
    data: meta,
    isLoading: isLoadingMeta,
    isError: isMetaError,
  } = useShareLinkMeta(token || '');

  // Query share link access (only if no password required or verified)
  const {
    data: accessData,
    isLoading: isLoadingAccess,
    isError: isAccessError,
    error: accessError,
  } = useShareLinkAccess(token || '', month, {
    enabled: !!token && (!meta?.requiresPassword || isPasswordVerified),
  });

  // Password verification
  const verifyMutation = useShareLinkVerify();

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;

      try {
        const params = month ? { token, password, month } : { token, password };
        await verifyMutation.mutateAsync(params);
        setIsPasswordVerified(true);
      } catch {
        // Error handled by mutation
      }
    },
    [token, password, month, verifyMutation]
  );

  // Transform posts to FullCalendar events
  const calendarEvents = useMemo(() => {
    const posts = accessData?.calendar?.posts || (accessData?.post ? [accessData.post] : []);
    return posts
      .filter((post) => post.scheduledAt)
      .map((post) => ({
        id: post.id,
        title: post.baseContent?.slice(0, 50) || 'No content',
        start: post.scheduledAt!,
        allDay: false,
        extendedProps: { post },
      }));
  }, [accessData]);

  // Get all posts for list view
  const posts = useMemo(() => {
    if (accessData?.calendar?.posts) {
      return [...accessData.calendar.posts].sort((a, b) => {
        if (!a.scheduledAt && !b.scheduledAt) return 0;
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
    }
    if (accessData?.post) {
      return [accessData.post];
    }
    return [];
  }, [accessData]);

  // Count posts needing review
  const postsNeedingReview = useMemo(
    () => posts.filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL').length,
    [posts]
  );

  // Handle event click
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const post = arg.event.extendedProps.post as SharedPostData;
    setSelectedPostId(post.id);
  }, []);

  // Get selected post from live data (for optimistic updates)
  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return posts.find((p) => p.id === selectedPostId) || null;
  }, [selectedPostId, posts]);

  // Get month display
  const monthDisplay = useMemo(() => {
    if (month) {
      const [year, monthNum] = month.split('-');
      return format(new Date(Number(year), Number(monthNum) - 1, 1), 'MMMM yyyy');
    }
    return format(new Date(), 'MMMM yyyy');
  }, [month]);

  // Handle month navigation
  const handlePrevMonth = useCallback(() => {
    const currentMonth = month || format(new Date(), 'yyyy-MM');
    const parts = currentMonth.split('-').map(Number);
    const year = parts[0] ?? new Date().getFullYear();
    const monthNum = parts[1] ?? new Date().getMonth() + 1;
    const prevDate = new Date(year, monthNum - 2, 1);
    setSearchParams({ month: format(prevDate, 'yyyy-MM') });
  }, [month, setSearchParams]);

  const handleNextMonth = useCallback(() => {
    const currentMonth = month || format(new Date(), 'yyyy-MM');
    const parts = currentMonth.split('-').map(Number);
    const year = parts[0] ?? new Date().getFullYear();
    const monthNum = parts[1] ?? new Date().getMonth() + 1;
    const nextDate = new Date(year, monthNum, 1);
    setSearchParams({ month: format(nextDate, 'yyyy-MM') });
  }, [month, setSearchParams]);

  // Loading state
  if (isLoadingMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Spinner size="lg" />
          <p className="mt-4 text-neutral-500 text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Error states
  if (isMetaError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Link Not Found</h1>
          <p className="text-neutral-500">
            This share link doesn't exist or has been deleted. Please request a new link from the
            sender.
          </p>
        </motion.div>
      </div>
    );
  }

  if (meta?.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Link Expired</h1>
          <p className="text-neutral-500">
            This share link has expired. Please request a new link from the sender.
          </p>
        </motion.div>
      </div>
    );
  }

  // Password required
  if (meta?.requiresPassword && !isPasswordVerified && !accessData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-neutral-200/50 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900">Password Protected</h1>
              <p className="text-neutral-500 mt-2 text-sm">
                Enter the password to view this content.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={verifyMutation.isPending}
              >
                Unlock
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Access error
  if (isAccessError) {
    const errorMessage =
      accessError && typeof accessError === 'object' && 'response' in accessError
        ? ((accessError as { response?: { data?: { message?: string } } }).response?.data
            ?.message ?? 'Failed to load content')
        : 'Failed to load content';

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Error</h1>
          <p className="text-neutral-500">{errorMessage}</p>
        </motion.div>
      </div>
    );
  }

  // Loading access data
  if (isLoadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Spinner size="lg" />
          <p className="mt-4 text-neutral-500 text-sm">Loading content...</p>
        </motion.div>
      </div>
    );
  }

  const canComment = accessData?.permissions === 'VIEW_COMMENT';

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Welcome section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-neutral-900">
                  Content Review
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{monthDisplay}</p>
              </div>
            </div>

            {/* Review summary - more compact on mobile */}
            {posts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-50/50 border border-primary-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-lg font-semibold text-primary-600">
                      {posts.length}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {posts.length === 1 ? '1 post' : `${posts.length} posts`} to review
                    </p>
                    {postsNeedingReview > 0 && (
                      <p className="text-xs text-neutral-500">
                        {postsNeedingReview} awaiting your feedback
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Controls - stacked on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Month navigation */}
            <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 sm:p-2.5 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation"
                aria-label="Previous month"
              >
                <svg
                  className="w-5 h-5 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="text-sm font-medium text-neutral-700 min-w-[130px] sm:min-w-[120px] text-center">
                {monthDisplay}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 sm:p-2.5 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation"
                aria-label="Next month"
              >
                <svg
                  className="w-5 h-5 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* View toggle - full width on mobile */}
            <div className="flex rounded-lg bg-neutral-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-md transition-all touch-manipulation',
                  viewMode === 'list'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 active:bg-neutral-200/50'
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={clsx(
                  'flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-md transition-all touch-manipulation',
                  viewMode === 'calendar'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 active:bg-neutral-200/50'
                )}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {viewMode === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-neutral-200/80 p-2 sm:p-4 md:p-6 overflow-x-auto"
            >
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                {...(month ? { initialDate: `${month}-01` } : {})}
                headerToolbar={false}
                events={calendarEvents}
                eventContent={renderSharedEventContent}
                eventClick={handleEventClick}
                height="auto"
                dayMaxEvents={3}
                firstDay={1}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto space-y-3 sm:space-y-4"
            >
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-neutral-200/80 p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-1">No posts this month</h3>
                  <p className="text-neutral-500 text-sm">
                    There are no posts scheduled for {monthDisplay}.
                  </p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PostCard
                      post={post}
                      onClick={() => setSelectedPostId(post.id)}
                      canComment={canComment}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            onClose={() => setSelectedPostId(null)}
            canComment={canComment}
            token={token!}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Render event content for FullCalendar - matches app's calendar event card style
// Responsive: simplified on mobile, detailed on larger screens
function renderSharedEventContent(eventInfo: {
  event: { title: string; start: Date | null; extendedProps: { post: SharedPostData } };
}) {
  const post = eventInfo.event.extendedProps.post;
  const platforms = post.channels.map((c) => c.platform);
  const uniquePlatforms = [...new Set(platforms)];
  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT!;
  const eventTime = eventInfo.event.start ? format(eventInfo.event.start, 'HH:mm') : '';

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 sm:p-2 mx-0.5 sm:mx-1 cursor-pointer hover:shadow-md transition-shadow min-h-[40px] sm:min-h-0">
      {/* Mobile: Compact view with status dot and time only */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1">
          <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
          {eventTime && <span className="text-2xs text-neutral-500 truncate">{eventTime}</span>}
        </div>
        <p className="text-2xs text-neutral-700 line-clamp-1 mt-0.5">
          {post.baseContent?.slice(0, 15) || 'Post'}
        </p>
      </div>

      {/* Tablet/Desktop: Full view with platforms, content, and status */}
      <div className="hidden sm:block">
        {/* Header: Platform icons + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            {uniquePlatforms.slice(0, 2).map((platform) => (
              <PlatformIcon key={platform} platform={platform} size="sm" />
            ))}
            {uniquePlatforms.length > 2 && (
              <span className="text-2xs text-neutral-400">+{uniquePlatforms.length - 2}</span>
            )}
          </div>
          {eventTime && <span className="text-xs text-neutral-400">{eventTime}</span>}
        </div>
        {/* Content preview */}
        <p className="text-xs text-neutral-700 line-clamp-1 mb-1">
          {post.baseContent?.slice(0, 25) || 'No content'}...
        </p>
        {/* Status indicator */}
        <div className="flex items-center gap-1">
          <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)} />
          <span className="text-xs text-neutral-400">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
}

// Post card for list view - responsive for mobile/tablet/desktop
function PostCard({
  post,
  onClick,
  canComment,
}: {
  post: SharedPostData;
  onClick: () => void;
  canComment: boolean;
}) {
  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT!;
  const needsReview = post.status === 'DRAFT' || post.status === 'PENDING_APPROVAL';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left bg-white rounded-xl sm:rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden',
        'hover:shadow-md hover:border-neutral-300/80 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300',
        'active:scale-[0.99] touch-manipulation'
      )}
    >
      <div className={clsx('border-l-4', statusConfig.borderColor)}>
        <div className="p-4 sm:p-5">
          {/* Header row - stacked on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Status indicator */}
              <div
                className={clsx(
                  'px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-2xs sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5',
                  statusConfig.bgColor,
                  statusConfig.textColor
                )}
              >
                <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)} />
                {statusConfig.label}
              </div>

              {/* Date */}
              {post.scheduledAt && (
                <span className="text-xs sm:text-sm text-neutral-500">
                  {format(parseISO(post.scheduledAt), 'MMM d · h:mm a')}
                </span>
              )}
            </div>

            {/* Review badge */}
            {needsReview && canComment && (
              <span className="self-start px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary-600 text-white text-2xs sm:text-xs font-medium">
                Review →
              </span>
            )}
          </div>

          {/* Content row - vertical on mobile, horizontal on larger screens */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Media preview */}
            {post.media[0] && (
              <div className="w-full sm:w-24 h-40 sm:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                <img
                  src={post.media[0].thumbnailUrl || post.media[0].url}
                  alt={post.media[0].altText || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Content */}
              <p className="text-sm sm:text-base text-neutral-800 line-clamp-2 sm:line-clamp-2 mb-3 leading-relaxed">
                {post.baseContent || 'No content'}
              </p>

              {/* Footer - more compact on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                {/* Platforms */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {post.channels.slice(0, 3).map((channel, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 sm:gap-1.5 text-xs text-neutral-500"
                    >
                      <PlatformIcon platform={channel.platform} size="sm" />
                      <span className="hidden md:inline truncate max-w-[100px]">
                        {channel.accountName}
                      </span>
                    </span>
                  ))}
                  {post.channels.length > 3 && (
                    <span className="text-xs text-neutral-400">+{post.channels.length - 3}</span>
                  )}
                </div>

                {/* Author & comments */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {post.commentCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {post.commentCount}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Avatar src={post.author.avatarUrl} name={post.author.fullName} size="xs" />
                    <span className="text-xs text-neutral-500 hidden sm:inline">
                      {post.author.fullName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// Post detail modal
function PostDetailModal({
  post,
  onClose,
  canComment,
  token,
}: {
  post: SharedPostData;
  onClose: () => void;
  canComment: boolean;
  token: string;
}) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [approvalName, setApprovalName] = useState('');
  const [approvalEmail, setApprovalEmail] = useState('');

  const addComment = useExternalComment(token);
  const approvePost = useExternalApproval(token);

  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT!;
  const canApprove = canComment && (post.status === 'DRAFT' || post.status === 'PENDING_APPROVAL');

  const handleSubmitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentName || !commentEmail || !commentContent) return;

      await addComment.mutateAsync({
        postId: post.id,
        name: commentName,
        email: commentEmail,
        content: commentContent,
        authorName: commentName, // For optimistic UI update
      });

      setCommentName('');
      setCommentEmail('');
      setCommentContent('');
      setShowCommentForm(false);
    },
    [addComment, post.id, commentName, commentEmail, commentContent]
  );

  const handleApprove = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!approvalName || !approvalEmail) return;

      await approvePost.mutateAsync({
        postId: post.id,
        name: approvalName,
        email: approvalEmail,
      });

      setShowApprovalForm(false);
      setApprovalName('');
      setApprovalEmail('');
    },
    [approvePost, post.id, approvalName, approvalEmail]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - full screen on mobile, inset on larger screens */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute inset-0 sm:inset-4 md:inset-6 lg:inset-12 bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200/80 bg-white gap-3 sm:gap-0">
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={clsx(
                  'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2',
                  statusConfig.bgColor,
                  statusConfig.textColor
                )}
              >
                <span
                  className={clsx('w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full', statusConfig.dotColor)}
                />
                {statusConfig.label}
              </div>
              {post.scheduledAt && (
                <span className="text-xs sm:text-sm text-neutral-500 hidden sm:inline">
                  {format(parseISO(post.scheduledAt), 'MMMM d, yyyy · h:mm a')}
                </span>
              )}
            </div>
            {/* Close button - always visible on mobile */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors sm:hidden"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {/* Mobile date display */}
          {post.scheduledAt && (
            <span className="text-xs text-neutral-500 sm:hidden">
              {format(parseISO(post.scheduledAt), 'MMM d, yyyy · h:mm a')}
            </span>
          )}
          <div className="hidden sm:flex items-center gap-3">
            {canApprove && !showApprovalForm && (
              <Button variant="primary" size="sm" onClick={() => setShowApprovalForm(true)}>
                Approve Post
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Approval Form Banner */}
        <AnimatePresence>
          {showApprovalForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-b border-emerald-100">
                <form onSubmit={handleApprove}>
                  <p className="text-sm text-emerald-800 font-medium mb-3">
                    Enter your details to approve this post:
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Your name"
                        value={approvalName}
                        onChange={(e) => setApprovalName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={approvalEmail}
                        onChange={(e) => setApprovalEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={approvePost.isPending}
                        className="flex-1 sm:flex-initial"
                      >
                        Confirm Approval
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        onClick={() => {
                          setShowApprovalForm(false);
                          setApprovalName('');
                          setApprovalEmail('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
            {/* Author */}
            <div className="flex items-center gap-3 mb-6">
              <Avatar src={post.author.avatarUrl} name={post.author.fullName} size="md" />
              <div>
                <p className="font-medium text-neutral-900">{post.author.fullName}</p>
                <p className="text-sm text-neutral-500">Author</p>
              </div>
            </div>

            {/* Media */}
            {post.media.length > 0 && (
              <div className="mb-6">
                <div
                  className={clsx(
                    'grid gap-3',
                    post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  )}
                >
                  {post.media.map((media) => (
                    <div key={media.id} className="rounded-xl overflow-hidden bg-neutral-100">
                      <img src={media.url} alt={media.altText || ''} className="w-full h-auto" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="mb-6">
              <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed text-lg">
                {post.baseContent}
              </p>
            </div>

            {/* Channels */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Publishing to</h3>
              <div className="flex flex-wrap gap-2">
                {post.channels.map((channel, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-sm text-neutral-700"
                  >
                    <PlatformIcon platform={channel.platform} size="md" />
                    {channel.accountName}
                  </span>
                ))}
              </div>
            </div>

            {/* Comments section */}
            {canComment && (
              <div className="border-t border-neutral-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-neutral-900">
                    Feedback{' '}
                    <span className="text-neutral-400 font-normal">({post.commentCount})</span>
                  </h3>
                  {!showCommentForm && (
                    <Button variant="secondary" size="sm" onClick={() => setShowCommentForm(true)}>
                      Leave feedback
                    </Button>
                  )}
                </div>

                <AnimatePresence>
                  {showCommentForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleSubmitComment}
                      className="bg-neutral-50 rounded-xl p-4 mb-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Input
                          placeholder="Your name"
                          value={commentName}
                          onChange={(e) => setCommentName(e.target.value)}
                          required
                        />
                        <Input
                          type="email"
                          placeholder="Your email"
                          value={commentEmail}
                          onChange={(e) => setCommentEmail(e.target.value)}
                          required
                        />
                      </div>
                      <textarea
                        placeholder="Share your thoughts or suggestions..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none transition-all"
                        rows={3}
                        required
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowCommentForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={addComment.isPending}
                        >
                          Submit Feedback
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Display existing comments */}
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-3">
                    {post.comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-neutral-50 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            src={comment.author.avatarUrl}
                            name={comment.author.fullName}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-neutral-900 text-sm">
                                {comment.author.fullName}
                              </span>
                              {comment.isExternal && (
                                <span className="text-2xs px-1.5 py-0.5 bg-neutral-200 text-neutral-600 rounded">
                                  External
                                </span>
                              )}
                              <span className="text-xs text-neutral-400">
                                {format(parseISO(comment.createdAt), 'MMM d · h:mm a')}
                              </span>
                            </div>
                            <p className="mt-1.5 text-neutral-700 text-sm whitespace-pre-wrap leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Empty state for comments */}
                {(!post.comments || post.comments.length === 0) && !showCommentForm && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-neutral-500">
                      No feedback yet. Be the first to comment!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile fixed bottom action bar */}
        {canApprove && !showApprovalForm && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200 safe-area-inset-bottom">
            <Button variant="primary" className="w-full" onClick={() => setShowApprovalForm(true)}>
              Approve Post
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Platform icon component
function PlatformIcon({ platform, size = 'md' }: { platform: string; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (platform === 'INSTAGRAM') {
    return (
      <svg
        className={clsx(sizeClasses, 'text-platform-instagram')}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }

  if (platform === 'LINKEDIN') {
    return (
      <svg
        className={clsx(sizeClasses, 'text-platform-linkedin')}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }

  return (
    <svg className={clsx(sizeClasses, 'text-neutral-400')} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}
