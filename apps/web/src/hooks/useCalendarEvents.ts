/**
 * Social Planner - Calendar Events Hooks
 *
 * TanStack Query hooks for custom calendar events (meetings, deadlines, reminders).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  CalendarEventSummary,
  CalendarEventDetail,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
} from '@social-planner/shared';

// Query keys
export const calendarEventKeys = {
  all: ['calendar-events'] as const,
  list: (filters: CalendarEventFilters) => [...calendarEventKeys.all, 'list', filters] as const,
  detail: (id: string) => [...calendarEventKeys.all, 'detail', id] as const,
};

export interface CalendarEventFilters {
  from: string; // ISO date string
  to: string; // ISO date string
}

/**
 * Hook to fetch calendar events within a date range
 */
export function useCalendarEvents(filters: CalendarEventFilters) {
  return useQuery({
    queryKey: calendarEventKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('from', filters.from);
      params.set('to', filters.to);

      const { data } = await api.get<{ data: CalendarEventSummary[] }>(
        `/calendar-events?${params.toString()}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch a single calendar event
 */
export function useCalendarEvent(eventId: string | null) {
  return useQuery({
    queryKey: calendarEventKeys.detail(eventId ?? ''),
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await api.get<CalendarEventDetail>(`/calendar-events/${eventId}`);
      return data;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to create a calendar event
 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCalendarEventRequest) => {
      const response = await api.post<CalendarEventDetail>('/calendar-events', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
      toast.success('Event created');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to update a calendar event
 */
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateCalendarEventRequest;
    }) => {
      const response = await api.patch<CalendarEventDetail>(`/calendar-events/${eventId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
      toast.success('Event updated');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to reschedule a calendar event (drag-and-drop)
 */
export function useRescheduleCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      startAt,
      endAt,
    }: {
      eventId: string;
      startAt: string;
      endAt?: string | null;
    }) => {
      const response = await api.patch<CalendarEventDetail>(
        `/calendar-events/${eventId}/reschedule`,
        { startAt, endAt }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
      toast.success('Event rescheduled');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook to delete a calendar event
 */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/calendar-events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
      toast.success('Event deleted');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}
