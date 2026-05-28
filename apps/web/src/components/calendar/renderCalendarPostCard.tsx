/**
 * FullCalendar Event Content Renderer
 *
 * Separated to avoid react-refresh warning about mixed exports.
 * Handles post events, article events, issue calendar events, and custom calendar events.
 */

import type { EventContentArg } from '@fullcalendar/core';
import { CalendarPostCard } from './CalendarPostCard';
import { CalendarArticleCard } from './CalendarArticleCard';
import { CalendarEventCard } from './CalendarEventCard';

/**
 * Issue Calendar Event Card
 * Simple, elegant display for holidays and important dates.
 */
function IssueEventCard({ eventInfo }: { eventInfo: EventContentArg }) {
  const { title } = eventInfo.event.extendedProps;
  const displayTitle = title || eventInfo.event.title;

  return (
    <div
      className="
        flex items-center gap-1.5 px-2 py-1
        bg-neutral-50/90 border border-teal-200/40
        rounded-md text-xs text-neutral-500
        cursor-default select-none
      "
    >
      <CalendarIcon />
      <span className="truncate font-medium">{displayTitle}</span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-3 h-3 text-teal-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Pending Action Event Card
 * Shows AI-requested scheduling that needs user approval.
 */
function PendingActionCard({ eventInfo }: { eventInfo: EventContentArg }) {
  // pendingAction available via eventInfo.event.extendedProps if needed
  void eventInfo;

  return (
    <div
      className="
        flex items-center gap-1.5 px-2 py-1
        bg-amber-50 border border-amber-300
        rounded-md text-xs text-amber-800
        cursor-pointer hover:bg-amber-100
        transition-colors duration-150
        animate-pulse
      "
    >
      <AIIcon />
      <span className="truncate font-medium">Needs Review</span>
    </div>
  );
}

function AIIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-amber-600 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    </svg>
  );
}

/**
 * Render function for FullCalendar eventContent prop
 * Routes to appropriate component based on event type
 */
export const renderCalendarPostCard = (eventInfo: EventContentArg) => {
  // Check if this is a pending MCP action (AI scheduling request)
  if (eventInfo.event.extendedProps.isPendingAction) {
    return <PendingActionCard eventInfo={eventInfo} />;
  }

  // Check if this is an issue calendar event (holidays, etc.)
  if (eventInfo.event.extendedProps.isIssueEvent) {
    return <IssueEventCard eventInfo={eventInfo} />;
  }

  // Check if this is a custom calendar event (meetings, deadlines, etc.)
  if (eventInfo.event.extendedProps.isCalendarEvent) {
    return <CalendarEventCard eventInfo={eventInfo} />;
  }

  // Check if this is an article event
  if (eventInfo.event.extendedProps.isArticle) {
    return <CalendarArticleCard eventInfo={eventInfo} />;
  }

  // Default: render as post card
  return <CalendarPostCard eventInfo={eventInfo} />;
};
