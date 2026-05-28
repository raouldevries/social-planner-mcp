/**
 * Calendar Page
 *
 * Main calendar view with FullCalendar integration, refined Apple-inspired design.
 *
 * Design principles applied:
 * - Inevitable simplicity: Minimal controls that don't distract from content
 * - Typography as architecture: Clear date hierarchy
 * - Purposeful whitespace: Calendar cells breathe
 * - Meaningful motion: Smooth view transitions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { transitions } from '@/lib/animations';

import {
  useCalendarPosts,
  useReschedulePost,
  useCalendarArticles,
  useRescheduleArticle,
} from '@/hooks/useCalendar';
import { useCalendarEvents, useRescheduleCalendarEvent } from '@/hooks/useCalendarEvents';
import { useMCPPendingActions } from '@/hooks/useMCP';
import { CalendarSidebar, renderCalendarPostCard } from '@/components/calendar';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import { ShareLinkModal } from '@/components/share/ShareLinkModal';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import toast from 'react-hot-toast';
import type { PostSummary, ArticleSummary, CalendarEventSummary } from '@social-planner/shared';
import issuekalenderData from '@/data/issuekalender-2026.json';

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return isMobile;
}

// Posts that can be rescheduled via drag-and-drop (all except published)
function canReschedule(post: PostSummary): boolean {
  return post.status !== 'PUBLISHED';
}

export function Calendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const calendarRef = useRef<FullCalendar>(null);

  // Mobile detection for responsive calendar view
  const isMobile = useIsMobile(768);

  // Get initial date from URL param (e.g., /calendar?date=2026-02-12)
  const getInitialDate = () => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  // View state (desktop preference, mobile always uses listWeek)
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(getInitialDate);

  // Effective view: listWeek on mobile, user's choice on desktop
  const effectiveView = isMobile ? 'listWeek' : currentView;

  // Navigate to today on mount (unless a specific date is in the URL)
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && !searchParams.get('date')) {
      api.gotoDate(new Date());
    }
  }, []);

  // Update FullCalendar view when effective view changes
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && api.view.type !== effectiveView) {
      api.changeView(effectiveView);
    }
  }, [effectiveView]);

  // Navigation direction for animations (-1 = backward, 0 = neutral, 1 = forward)
  const [navDirection, setNavDirection] = useState(0);

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Issue calendar state (default: off)
  const [showIssueCalendar, setShowIssueCalendar] = useState(false);

  // Custom events state (default: on)
  const [showCustomEvents, setShowCustomEvents] = useState(true);

  // Articles state (default: on)
  const [showArticles, setShowArticles] = useState(true);

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventSummary | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>(undefined);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Date range for fetching posts (with buffer for smooth navigation)
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    };
  }, [currentDate]);

  // Fetch posts
  const {
    data: postsData,
    isLoading,
    isError,
    refetch,
  } = useCalendarPosts({
    ...dateRange,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    platform: selectedPlatform ?? undefined,
  });

  // Reschedule mutations
  const reschedulePost = useReschedulePost();
  const rescheduleCalendarEvent = useRescheduleCalendarEvent();
  const rescheduleArticle = useRescheduleArticle();

  // Fetch articles for calendar
  const { data: articlesData } = useCalendarArticles({
    ...dateRange,
    status: undefined, // Show all articles regardless of status
    authorId: undefined,
  });

  // Fetch custom calendar events
  const { data: customEventsData } = useCalendarEvents({
    from: new Date(dateRange.from).toISOString(),
    to: new Date(dateRange.to).toISOString(),
  });

  // Fetch pending MCP actions (AI-requested scheduling that needs approval)
  const { data: pendingActionsData } = useMCPPendingActions();

  // Transform posts to FullCalendar events
  const postEvents = useMemo(() => {
    if (!postsData?.data) return [];

    return postsData.data
      .filter((post) => post.scheduledAt)
      .map((post) => ({
        id: post.id,
        title: post.baseContent?.slice(0, 30) || 'No content',
        start: post.scheduledAt!,
        allDay: false,
        extendedProps: { post, isIssueEvent: false },
        editable: canReschedule(post),
      }));
  }, [postsData]);

  // Transform custom calendar events
  const customEvents = useMemo(() => {
    if (!showCustomEvents || !customEventsData?.data) return [];

    return customEventsData.data.map((event) => {
      const eventData: {
        id: string;
        title: string;
        start: string;
        end?: string;
        allDay: boolean;
        extendedProps: { isCalendarEvent: boolean; calendarEvent: typeof event };
        editable: boolean;
        display: string;
      } = {
        id: event.id,
        title: event.title,
        start: event.startAt,
        allDay: event.allDay,
        extendedProps: {
          isCalendarEvent: true,
          calendarEvent: event,
        },
        editable: true, // Custom events are always editable
        display: 'block',
      };

      // Only add end if it exists
      if (event.endAt) {
        eventData.end = event.endAt;
      }

      return eventData;
    });
  }, [showCustomEvents, customEventsData]);

  // Transform articles to calendar events
  const articleEvents = useMemo(() => {
    if (!showArticles || !articlesData?.data) return [];

    return articlesData.data
      .filter((article) => article.plannedAt)
      .map((article) => ({
        id: `article-${article.id}`,
        title: article.title,
        start: article.plannedAt!,
        allDay: true, // Articles are day-based planning
        extendedProps: {
          article,
          isArticle: true,
        },
        editable: true, // Articles are always editable
        display: 'block',
      }));
  }, [showArticles, articlesData]);

  // Transform issue calendar events
  const issueEvents = useMemo(() => {
    if (!showIssueCalendar) return [];

    return issuekalenderData.events.map((event, index) => ({
      id: `issue-${index}`,
      title: event.title,
      start: event.date,
      allDay: true,
      extendedProps: {
        isIssueEvent: true,
        description: event.description,
        title: event.title,
      },
      editable: false,
      display: 'block',
      classNames: ['issue-calendar-event'],
    }));
  }, [showIssueCalendar]);

  // Transform pending MCP actions into calendar events
  const pendingActionEvents = useMemo(() => {
    if (!pendingActionsData?.actions) return [];

    return pendingActionsData.actions
      .filter((action) => action.actionType === 'schedule_post' && action.status === 'PENDING')
      .flatMap((action) => {
        // Extract scheduled dates from the payload
        const payload = action.payload as {
          postId?: string;
          channels?: Array<{ socialAccountId: string; scheduledAt: string }>;
        };

        if (!payload.channels || payload.channels.length === 0) return [];

        // Create an event for each channel's scheduled date
        return payload.channels.map((channel, index) => ({
          id: `pending-${action.id}-${index}`,
          title: 'AI Request: ' + action.description.slice(0, 30),
          start: channel.scheduledAt,
          allDay: false,
          extendedProps: {
            isPendingAction: true,
            pendingAction: action,
          },
          editable: false,
          display: 'block',
          classNames: ['pending-action-event'],
        }));
      });
  }, [pendingActionsData]);

  // Combine all events
  const events = useMemo(() => {
    return [
      ...postEvents,
      ...articleEvents,
      ...customEvents,
      ...issueEvents,
      ...pendingActionEvents,
    ];
  }, [postEvents, articleEvents, customEvents, issueEvents, pendingActionEvents]);

  // Navigation handlers
  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const handleToday = useCallback(() => {
    const today = new Date();
    const direction = today < currentDate ? -1 : today > currentDate ? 1 : 0;
    setNavDirection(direction);
    calendarRef.current?.getApi().today();
    setCurrentDate(today);
  }, [currentDate]);

  const handlePrev = useCallback(() => {
    setNavDirection(-1);
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    setNavDirection(1);
    calendarRef.current?.getApi().next();
  }, []);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setCurrentDate(arg.view.currentStart);
  }, []);

  // Event handlers
  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      // Handle pending MCP action - show toast directing to header
      if (arg.event.extendedProps.isPendingAction) {
        toast('Click the AI icon in the header to approve or reject this request', {
          icon: '🤖',
          duration: 4000,
        });
        return;
      }

      // Don't navigate for issue calendar events
      if (arg.event.extendedProps.isIssueEvent) {
        return;
      }

      // Open modal for custom calendar events
      if (arg.event.extendedProps.isCalendarEvent) {
        setEditingEvent(arg.event.extendedProps.calendarEvent);
        setDefaultEventDate(undefined);
        setIsEventModalOpen(true);
        return;
      }

      // Navigate to article detail for article events
      if (arg.event.extendedProps.isArticle) {
        const article = arg.event.extendedProps.article as ArticleSummary;
        navigate(`/articles/${article.id}`, { state: { from: 'calendar' } });
        return;
      }

      // Navigate to post detail for post events
      navigate(`/posts/${arg.event.id}`, { state: { from: 'calendar' } });
    },
    [navigate]
  );

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      const newDate = arg.event.start;
      if (!newDate) {
        arg.revert();
        return;
      }

      // Handle custom calendar event reschedule
      if (arg.event.extendedProps.isCalendarEvent) {
        rescheduleCalendarEvent.mutate(
          {
            eventId: arg.event.id,
            startAt: newDate.toISOString(),
            endAt: arg.event.end?.toISOString() ?? null,
          },
          { onError: () => arg.revert() }
        );
        return;
      }

      // Handle article reschedule
      if (arg.event.extendedProps.isArticle) {
        const article = arg.event.extendedProps.article as ArticleSummary;
        rescheduleArticle.mutate(
          { articleId: article.id, plannedAt: newDate.toISOString() },
          { onError: () => arg.revert() }
        );
        return;
      }

      // Handle post reschedule
      reschedulePost.mutate(
        { postId: arg.event.id, scheduledAt: newDate.toISOString() },
        { onError: () => arg.revert() }
      );
    },
    [reschedulePost, rescheduleCalendarEvent, rescheduleArticle]
  );

  const handleDateSelect = useCallback(
    (arg: DateSelectArg) => {
      const date = format(arg.start, "yyyy-MM-dd'T'HH:mm");
      navigate(`/posts/new?scheduledAt=${encodeURIComponent(date)}`, {
        state: { from: 'calendar' },
      });
    },
    [navigate]
  );

  const handleNewPost = useCallback(() => {
    navigate('/posts/new', { state: { from: 'calendar' } });
  }, [navigate]);

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null);
    setDefaultEventDate(new Date());
    setIsEventModalOpen(true);
  }, []);

  const handleNewArticle = useCallback(() => {
    navigate('/articles/new', { state: { from: 'calendar' } });
  }, [navigate]);

  const handleCloseEventModal = useCallback(() => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setDefaultEventDate(undefined);
  }, []);

  // Header title
  const headerTitle = useMemo(() => {
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate]);

  // Check if viewing today's month
  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return (
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  }, [currentDate]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] -m-6">
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:block"
        data-feedback-target="calendar-sidebar"
        data-feedback-label="Calendar Sidebar"
      >
        <CalendarSidebar
          selectedStatuses={selectedStatuses}
          selectedPlatform={selectedPlatform}
          onStatusChange={setSelectedStatuses}
          onPlatformChange={setSelectedPlatform}
          onNewPost={handleNewPost}
          onNewArticle={handleNewArticle}
          onNewEvent={handleNewEvent}
          showIssueCalendar={showIssueCalendar}
          onIssueCalendarToggle={setShowIssueCalendar}
          showCustomEvents={showCustomEvents}
          onCustomEventsToggle={setShowCustomEvents}
          showArticles={showArticles}
          onArticlesToggle={setShowArticles}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.div
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="relative h-full bg-white shadow-xl">
                {/* Close button */}
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close filters"
                >
                  <CloseIcon />
                </button>
                <CalendarSidebar
                  selectedStatuses={selectedStatuses}
                  selectedPlatform={selectedPlatform}
                  onStatusChange={setSelectedStatuses}
                  onPlatformChange={setSelectedPlatform}
                  onNewPost={handleNewPost}
                  onNewArticle={handleNewArticle}
                  onNewEvent={handleNewEvent}
                  showIssueCalendar={showIssueCalendar}
                  onIssueCalendarToggle={setShowIssueCalendar}
                  showCustomEvents={showCustomEvents}
                  onCustomEventsToggle={setShowCustomEvents}
                  showArticles={showArticles}
                  onArticlesToggle={setShowArticles}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating filter button for mobile */}
      <motion.button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 active:bg-primary-800 flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        aria-label="Open filters"
      >
        <FilterIcon />
      </motion.button>

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header - refined, minimal chrome, responsive */}
        <header
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-100"
          data-feedback-target="calendar-header"
          data-feedback-label="Calendar Navigation"
        >
          {/* Left: Navigation controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Today button - only show when not viewing current month */}
            <motion.button
              onClick={handleToday}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg
                transition-colors duration-200 min-h-[44px]
                ${
                  isCurrentMonth
                    ? 'text-neutral-400 cursor-default'
                    : 'text-primary-600 hover:bg-primary-50 active:bg-primary-100'
                }
              `}
              disabled={isCurrentMonth}
              whileHover={isCurrentMonth ? {} : { scale: 1.03 }}
              whileTap={isCurrentMonth ? {} : { scale: 0.97 }}
              transition={transitions.spring}
            >
              Today
            </motion.button>

            {/* Month navigation */}
            <div className="flex items-center">
              <motion.button
                onClick={handlePrev}
                className="
                  p-2 rounded-lg text-neutral-500
                  hover:bg-neutral-100 hover:text-neutral-700
                  active:bg-neutral-200
                  transition-colors duration-150
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                "
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={transitions.spring}
                aria-label="Previous month"
              >
                <ChevronLeftIcon />
              </motion.button>
              <motion.button
                onClick={handleNext}
                className="
                  p-2 rounded-lg text-neutral-500
                  hover:bg-neutral-100 hover:text-neutral-700
                  active:bg-neutral-200
                  transition-colors duration-150
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                "
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={transitions.spring}
                aria-label="Next month"
              >
                <ChevronRightIcon />
              </motion.button>
            </div>

            {/* Current month/year - animated on change */}
            <div className="relative overflow-hidden min-w-[140px] sm:min-w-[180px] ml-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={headerTitle}
                  className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight"
                  initial={{ opacity: 0, x: navDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: navDirection * -30 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {headerTitle}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* Overflow menu - calendar actions */}
            <Dropdown
              trigger={
                <button
                  className="
                    p-2 rounded-lg text-neutral-500
                    hover:bg-neutral-100 hover:text-neutral-700
                    active:bg-neutral-200
                    transition-colors duration-150
                    min-h-[44px] min-w-[44px] flex items-center justify-center
                  "
                  aria-label="Calendar options"
                >
                  <MoreIcon />
                </button>
              }
              align="left"
            >
              <DropdownItem onClick={() => setIsShareModalOpen(true)} icon={<ShareIcon />}>
                Share Calendar
              </DropdownItem>
              <DropdownItem onClick={() => window.print()} icon={<ExportIcon />}>
                Export / Print
              </DropdownItem>
            </Dropdown>

            {/* Loading indicator - subtle */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  className="ml-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <LoadingSpinner />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: View toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View toggle - pill-shaped segment control with sliding highlight (hidden on mobile) */}
            <div
              className="relative hidden sm:flex p-0.5 bg-neutral-200 rounded-lg"
              data-feedback-target="calendar-view-toggle"
              data-feedback-label="Calendar View Toggle"
            >
              {/* Sliding highlight indicator */}
              <motion.div
                className="absolute top-0.5 bottom-0.5 bg-white rounded-md shadow-md"
                initial={false}
                animate={{
                  x: currentView === 'dayGridMonth' ? 0 : 62,
                  width: currentView === 'dayGridMonth' ? 58 : 52,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 25,
                }}
              />
              <button
                onClick={() => handleViewChange('dayGridMonth')}
                className={`
                  relative z-10 px-3 py-2 text-sm font-medium rounded-md
                  transition-colors duration-200 min-h-[44px]
                  ${
                    currentView === 'dayGridMonth'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }
                `}
              >
                Month
              </button>
              <button
                onClick={() => handleViewChange('timeGridWeek')}
                className={`
                  relative z-10 px-3 py-2 text-sm font-medium rounded-md
                  transition-colors duration-200 min-h-[44px]
                  ${
                    currentView === 'timeGridWeek'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }
                `}
              >
                Week
              </button>
            </div>
          </div>
        </header>

        {/* Calendar content */}
        <div
          className="flex-1 overflow-hidden p-4"
          data-feedback-target="calendar-content"
          data-feedback-label="Calendar View"
        >
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={effectiveView}
              initialDate={currentDate}
              headerToolbar={false}
              events={events}
              eventContent={renderCalendarPostCard}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={isMobile ? 2 : 3}
              weekends={true}
              firstDay={1}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              select={handleDateSelect}
              height="100%"
              eventDisplay="block"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              nowIndicator={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              noEventsText="No posts scheduled"
            />
          )}
        </div>
      </div>

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        mode="calendar"
        month={format(currentDate, 'yyyy-MM')}
      />

      {/* Calendar Event Modal */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        event={editingEvent}
        defaultDate={defaultEventDate}
      />
    </div>
  );
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center max-w-sm">
        {/* Error illustration - subtle, not alarming */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
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

        <h3 className="text-base font-semibold text-neutral-900 mb-1">Unable to load calendar</h3>
        <p className="text-sm text-neutral-500 mb-4">
          There was a problem loading your posts. Please try again.
        </p>

        <button
          onClick={onRetry}
          className="
            inline-flex items-center gap-2 px-4 py-2
            text-sm font-medium text-white
            bg-primary-600 rounded-lg
            hover:bg-primary-700 active:bg-primary-800
            transition-colors duration-150
            shadow-sm
          "
        >
          <RefreshIcon />
          Try again
        </button>
      </div>
    </div>
  );
}

// Loading spinner - subtle, not distracting
function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 text-neutral-400 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Icons - consistent 24x24 viewBox, 1.5 stroke weight
function ShareIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}
