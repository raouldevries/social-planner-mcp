/**
 * Calendar Event Modal
 *
 * Modal for creating and editing custom calendar events.
 *
 * Design principles:
 * - Clean, minimal form layout
 * - Color picker with preset colors
 * - All-day toggle for flexible scheduling
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '@/hooks/useCalendarEvents';
import type { CalendarEventSummary, CreateCalendarEventRequest } from '@social-planner/shared';

export interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEventSummary | null;
  defaultDate?: Date | undefined;
}

// Color presets for calendar events
const CALENDAR_EVENT_COLORS = [
  '#0EA5E9', // sky-500 (default)
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#F97316', // orange-500
  '#10B981', // emerald-500
  '#64748B', // slate-500
] as const;

// Color preset configuration
const colorPresets = CALENDAR_EVENT_COLORS.map((color) => ({
  value: color,
  name: getColorName(color),
}));

function getColorName(color: string): string {
  const colorNames: Record<string, string> = {
    '#0EA5E9': 'Sky',
    '#8B5CF6': 'Violet',
    '#EC4899': 'Pink',
    '#F97316': 'Orange',
    '#10B981': 'Emerald',
    '#64748B': 'Slate',
  };
  return colorNames[color] || 'Custom';
}

export function CalendarEventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
}: CalendarEventModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#0EA5E9');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mutations
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const isEditing = !!event;
  const isSubmitting = createEvent.isPending || updateEvent.isPending;
  const isDeleting = deleteEvent.isPending;

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing existing event
        setTitle(event.title);
        setDescription(event.description || '');
        setAllDay(event.allDay);
        setColor(event.color);

        const start = new Date(event.startAt);
        setStartDate(format(start, 'yyyy-MM-dd'));
        setStartTime(format(start, 'HH:mm'));

        if (event.endAt) {
          const end = new Date(event.endAt);
          setEndDate(format(end, 'yyyy-MM-dd'));
          setEndTime(format(end, 'HH:mm'));
        } else {
          setEndDate('');
          setEndTime('');
        }
      } else {
        // Creating new event
        setTitle('');
        setDescription('');
        setAllDay(false);
        setColor('#0EA5E9');

        const date = defaultDate || new Date();
        setStartDate(format(date, 'yyyy-MM-dd'));
        setStartTime(format(date, 'HH:mm'));
        setEndDate('');
        setEndTime('');
      }
    }
  }, [isOpen, event, defaultDate]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    if (!startDate) return;

    // Validate time is provided for non-all-day events
    if (!allDay && !startTime) return;

    // Build start datetime
    const startAt = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}`).toISOString();

    // Build end datetime if provided
    let endAt: string | undefined;
    if (endDate) {
      endAt = allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : endTime
          ? new Date(`${endDate}T${endTime}`).toISOString()
          : undefined;

      // Validate end is after start
      if (endAt && new Date(endAt) <= new Date(startAt)) {
        return; // End must be after start
      }
    }

    const data: CreateCalendarEventRequest = {
      title: title.trim(),
      startAt,
      allDay,
      color,
    };

    // Only add optional fields if they have values
    const trimmedDescription = description.trim();
    if (trimmedDescription) {
      data.description = trimmedDescription;
    }
    if (endAt) {
      data.endAt = endAt;
    }

    try {
      if (isEditing && event) {
        await updateEvent.mutateAsync({ eventId: event.id, data });
      } else {
        await createEvent.mutateAsync(data);
      }
      onClose();
    } catch {
      // Error handled by mutation
    }
  }, [
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    allDay,
    color,
    isEditing,
    event,
    createEvent,
    updateEvent,
    onClose,
  ]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch {
      // Error handled by mutation
    }
  }, [event, deleteEvent, onClose]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        title={isEditing ? 'Edit Event' : 'New Event'}
        footer={
          <>
            {isEditing && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
                className="mr-auto text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!title.trim() || !startDate || (!allDay && !startTime)}
            >
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting, deadline, reminder..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className={clsx(
                'block w-full rounded-lg border bg-white',
                'px-3.5 py-2 text-sm text-neutral-900',
                'placeholder:text-neutral-400',
                'border-neutral-200 hover:border-neutral-300',
                'focus:outline-none focus:border-primary-400',
                'focus:ring-2 focus:ring-offset-1 focus:ring-primary-500/20',
                'transition-all duration-200 ease-out',
                'resize-none'
              )}
            />
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
              className={clsx(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full',
                'border-2 border-transparent transition-colors duration-200 ease-in-out',
                allDay ? 'bg-primary-600' : 'bg-neutral-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full',
                  'bg-white shadow ring-0 transition duration-200 ease-in-out',
                  allDay ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-sm text-neutral-700">All-day event</span>
          </div>

          {/* Date/Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Start <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {!allDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* End */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">End</label>
              <div className="space-y-2">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                {!allDay && (
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                )}
              </div>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Color</label>
            <div className="flex items-center gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={clsx(
                    'w-8 h-8 rounded-full transition-all duration-150',
                    color === preset.value
                      ? 'ring-2 ring-offset-2 ring-neutral-400 scale-110'
                      : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
