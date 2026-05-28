/**
 * Calendar Event Card
 *
 * Custom event renderer for FullCalendar displaying user-created events
 * (meetings, deadlines, reminders) with custom colors.
 *
 * Design principles:
 * - Uses event's custom color as accent
 * - Clean, minimal card design
 * - Consistent with CalendarPostCard styling
 */

import { memo, useMemo } from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import type { CalendarEventSummary } from '@social-planner/shared';

interface CalendarEventCardProps {
  eventInfo: EventContentArg;
}

/**
 * Convert hex color to subtle styling
 * Events are intentionally muted so posts remain the primary visual focus
 */
function getColorStyles(hexColor: string) {
  // Convert hex to RGB for opacity manipulation
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return {
    backgroundColor: 'rgba(250, 250, 250, 0.9)', // Very subtle gray background
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`, // Soft colored border
    dotColor: hexColor,
    textColor: 'rgb(100, 100, 100)', // Neutral gray text
  };
}

export const CalendarEventCard = memo(function CalendarEventCard({
  eventInfo,
}: CalendarEventCardProps) {
  const event = eventInfo.event.extendedProps.calendarEvent as CalendarEventSummary;
  const isAllDay = event?.allDay ?? eventInfo.event.allDay;
  const color = event?.color ?? '#0EA5E9';
  const title = event?.title ?? eventInfo.event.title ?? 'Untitled Event';

  const colorStyles = useMemo(() => getColorStyles(color), [color]);

  // Format time display
  const timeDisplay = useMemo(() => {
    if (isAllDay) return null;
    const start = eventInfo.event.start;
    if (!start) return null;

    const hours = start.getHours().toString().padStart(2, '0');
    const minutes = start.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [eventInfo.event.start, isAllDay]);

  return (
    <div
      className="
        flex items-center gap-1.5 w-full px-2 py-1
        rounded-md border cursor-pointer
        hover:shadow-sm transition-shadow duration-150
        text-xs leading-tight
        overflow-hidden
      "
      style={{
        backgroundColor: colorStyles.backgroundColor,
        borderColor: colorStyles.borderColor,
      }}
    >
      {/* Calendar icon */}
      <CalendarIcon className="w-3 h-3 flex-shrink-0" style={{ color: colorStyles.dotColor }} />

      {/* Time (if not all-day) */}
      {timeDisplay && (
        <span
          className="flex-shrink-0 font-medium opacity-80"
          style={{ color: colorStyles.textColor }}
        >
          {timeDisplay}
        </span>
      )}

      {/* Title */}
      <span className="truncate font-medium" style={{ color: colorStyles.textColor }} title={title}>
        {title}
      </span>
    </div>
  );
});

function CalendarIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
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
