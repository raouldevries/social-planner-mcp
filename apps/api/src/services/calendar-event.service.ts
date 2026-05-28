/**
 * Social Planner - Calendar Event Service
 *
 * Handles CRUD operations for custom calendar events (meetings, deadlines, reminders).
 * Events are shared with the entire team.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type {
  CalendarEventSummary,
  CalendarEventDetail,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
} from '@social-planner/shared';

// ============================================
// HELPERS
// ============================================

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  timezone: true,
  role: true,
};

const calendarEventSelect = {
  id: true,
  title: true,
  description: true,
  startAt: true,
  endAt: true,
  allDay: true,
  color: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: userSummarySelect,
  },
};

function toCalendarEventSummary(event: any): CalendarEventSummary {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    allDay: event.allDay,
    color: event.color,
    createdBy: event.createdBy,
    createdAt: event.createdAt.toISOString(),
  };
}

function toCalendarEventDetail(event: any): CalendarEventDetail {
  return {
    ...toCalendarEventSummary(event),
    updatedAt: event.updatedAt.toISOString(),
  };
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * List calendar events within a date range
 */
export async function listCalendarEvents(filters: {
  from: string;
  to: string;
}): Promise<CalendarEventSummary[]> {
  const fromDate = new Date(filters.from);
  const toDate = new Date(filters.to);

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        // Events that start within the range
        {
          startAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        // Events that end within the range
        {
          endAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        // Events that span the entire range
        {
          startAt: { lte: fromDate },
          endAt: { gte: toDate },
        },
      ],
    },
    select: calendarEventSelect,
    orderBy: { startAt: 'asc' },
  });

  return events.map(toCalendarEventSummary);
}

/**
 * Get a single calendar event by ID
 */
export async function getCalendarEventById(eventId: string): Promise<CalendarEventDetail> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: calendarEventSelect,
  });

  if (!event) {
    throw new AppError('CALENDAR_EVENT_NOT_FOUND', 'Calendar event not found', 404);
  }

  return toCalendarEventDetail(event);
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
  userId: string,
  data: CreateCalendarEventRequest
): Promise<CalendarEventDetail> {
  // Validate end date is after start date
  if (data.endAt) {
    const startDate = new Date(data.startAt);
    const endDate = new Date(data.endAt);
    if (endDate <= startDate) {
      throw new AppError('INVALID_DATE_RANGE', 'End date must be after start date', 400);
    }
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      allDay: data.allDay ?? false,
      color: data.color ?? '#0EA5E9',
      createdById: userId,
    },
    select: calendarEventSelect,
  });

  return toCalendarEventDetail(event);
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  data: UpdateCalendarEventRequest
): Promise<CalendarEventDetail> {
  // Check if event exists and get current values for validation
  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true, startAt: true, endAt: true },
  });

  if (!existing) {
    throw new AppError('CALENDAR_EVENT_NOT_FOUND', 'Calendar event not found', 404);
  }

  // Validate end date is after start date (considering both existing and new values)
  const effectiveStartAt = data.startAt ? new Date(data.startAt) : existing.startAt;
  const effectiveEndAt =
    data.endAt !== undefined ? (data.endAt ? new Date(data.endAt) : null) : existing.endAt;

  if (effectiveEndAt && effectiveEndAt <= effectiveStartAt) {
    throw new AppError('INVALID_DATE_RANGE', 'End date must be after start date', 400);
  }

  const updateData: any = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.startAt !== undefined) {
    updateData.startAt = new Date(data.startAt);
  }
  if (data.endAt !== undefined) {
    updateData.endAt = data.endAt ? new Date(data.endAt) : null;
  }
  if (data.allDay !== undefined) {
    updateData.allDay = data.allDay;
  }
  if (data.color !== undefined) {
    updateData.color = data.color;
  }

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: updateData,
    select: calendarEventSelect,
  });

  return toCalendarEventDetail(event);
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('CALENDAR_EVENT_NOT_FOUND', 'Calendar event not found', 404);
  }

  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });
}

/**
 * Reschedule a calendar event (drag-and-drop)
 */
export async function rescheduleCalendarEvent(
  eventId: string,
  startAt: string,
  endAt?: string | null
): Promise<CalendarEventDetail> {
  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true, endAt: true, startAt: true },
  });

  if (!existing) {
    throw new AppError('CALENDAR_EVENT_NOT_FOUND', 'Calendar event not found', 404);
  }

  const newStartAt = new Date(startAt);

  // Calculate duration if original event had an end time
  let newEndAt: Date | null = null;
  if (endAt) {
    newEndAt = new Date(endAt);
  } else if (existing.endAt && existing.startAt) {
    // Preserve original duration
    const duration = existing.endAt.getTime() - existing.startAt.getTime();
    newEndAt = new Date(newStartAt.getTime() + duration);
  }

  // Validate end is after start
  if (newEndAt && newEndAt <= newStartAt) {
    throw new AppError('INVALID_DATE_RANGE', 'End date must be after start date', 400);
  }

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      startAt: newStartAt,
      endAt: newEndAt,
    },
    select: calendarEventSelect,
  });

  return toCalendarEventDetail(event);
}
