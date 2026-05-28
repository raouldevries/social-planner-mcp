/**
 * Scheduling Section
 *
 * Component for selecting publish timing - immediately or scheduled.
 */

import { useState, useEffect, useRef } from 'react';
import { format, addDays, setHours, setMinutes, parse } from 'date-fns';
import { clsx } from 'clsx';
import { motion, type Transition } from 'motion/react';
import { TimePicker, DatePicker } from '../ui';

/**
 * Spring configuration for snappy interactions.
 */
const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

export type ScheduleMode = 'now' | 'scheduled';

interface SchedulingSectionProps {
  mode: ScheduleMode;
  scheduledAt: string | null;
  onModeChange: (mode: ScheduleMode) => void;
  onScheduledAtChange: (scheduledAt: string | null) => void;
  disabled?: boolean;
}

export function SchedulingSection({
  mode,
  scheduledAt,
  onModeChange,
  onScheduledAtChange,
  disabled = false,
}: SchedulingSectionProps) {
  // Parse scheduledAt into date and time parts
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Ref for click-outside detection
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
    };

    if (showDatePicker || showTimePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker, showTimePicker]);

  // Sync from prop to local state only when prop changes significantly
  useEffect(() => {
    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      const newDate = format(parsed, 'yyyy-MM-dd');
      const newTime = format(parsed, 'HH:mm');
      // Only update if actually different to prevent loops
      if (newDate !== date || newTime !== time) {
        setDate(newDate);
        setTime(newTime);
      }
    } else if (!date && !time) {
      // Set defaults if we don't have values yet
      const tomorrow = setMinutes(setHours(addDays(new Date(), 1), 9), 0);
      const defaultDate = format(tomorrow, 'yyyy-MM-dd');
      const defaultTime = format(tomorrow, 'HH:mm');
      setDate(defaultDate);
      setTime(defaultTime);
      // Also update parent if in scheduled mode so Schedule button is enabled
      if (mode === 'scheduled') {
        onScheduledAtChange(tomorrow.toISOString());
      }
    }
  }, [scheduledAt]); // Only depend on scheduledAt, not date/time to prevent loops

  // Combine date and time into ISO string when user changes them
  // Only update if the value actually changed to prevent re-render loops
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (mode === 'scheduled' && newDate && time) {
      const combined = new Date(`${newDate}T${time}`);
      if (!isNaN(combined.getTime())) {
        onScheduledAtChange(combined.toISOString());
      }
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (mode === 'scheduled' && date && newTime) {
      const combined = new Date(`${date}T${newTime}`);
      if (!isNaN(combined.getTime())) {
        onScheduledAtChange(combined.toISOString());
      }
    }
  };

  // Handle mode change
  useEffect(() => {
    if (mode === 'now') {
      onScheduledAtChange(null);
    } else if (mode === 'scheduled' && date && time) {
      const combined = new Date(`${date}T${time}`);
      if (!isNaN(combined.getTime())) {
        onScheduledAtChange(combined.toISOString());
      }
    }
  }, [mode]); // Only trigger when mode changes, not when date/time change

  return (
    <div className="space-y-5">
      {/* Segmented Control */}
      <div
        className={clsx(
          'inline-flex p-1 bg-gray-100 rounded-lg',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <motion.button
          type="button"
          onClick={() => onModeChange('now')}
          disabled={disabled}
          whileHover={disabled ? {} : { scale: 1.02 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          transition={springTransition}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
            mode === 'now'
              ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Publish Now
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onModeChange('scheduled')}
          disabled={disabled}
          whileHover={disabled ? {} : { scale: 1.02 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          transition={springTransition}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
            mode === 'scheduled'
              ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Schedule
        </motion.button>
      </div>

      {/* Date/time picker when scheduled */}
      {mode === 'scheduled' && (
        <div ref={pickerContainerRef} className="relative">
          {/* Date and Time toggle row */}
          <div className="flex items-center gap-3">
            {/* Date display with calendar toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  if (!showDatePicker) setShowTimePicker(false);
                }}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  showDatePicker
                    ? 'bg-primary-50 text-primary-600'
                    : 'hover:bg-gray-100 text-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-base font-medium tabular-nums whitespace-nowrap">
                  {date
                    ? format(parse(date, 'yyyy-MM-dd', new Date()), 'd MMM yyyy')
                    : 'Select date'}
                </span>
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
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </button>

              {/* Date picker popover */}
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <DatePicker
                    value={date ? parse(date, 'yyyy-MM-dd', new Date()) : null}
                    onChange={(newDate) => {
                      const formatted = format(newDate, 'yyyy-MM-dd');
                      handleDateChange(formatted);
                      setShowDatePicker(false);
                    }}
                    minDate={new Date()}
                    label="Select date"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>

            {/* Time display with clock toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowTimePicker(!showTimePicker);
                  if (!showTimePicker) setShowDatePicker(false);
                }}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  showTimePicker
                    ? 'bg-primary-50 text-primary-600'
                    : 'hover:bg-gray-100 text-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-base font-medium tabular-nums">{time || '09:00'}</span>
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
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Time picker popover */}
              {showTimePicker && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <TimePicker
                    hours={time ? parseInt(time.split(':')[0] || '9', 10) : 9}
                    minutes={time ? parseInt(time.split(':')[1] || '0', 10) : 0}
                    onChange={(hours, minutes) => {
                      const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      handleTimeChange(newTime);
                    }}
                    label="Select time"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timezone hint - smaller and more subtle */}
      <p className="text-xs text-gray-400">
        Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
