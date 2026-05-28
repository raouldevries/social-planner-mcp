/**
 * Button Grid Date Picker
 *
 * A tap-friendly date picker with a grid of days, month navigation,
 * and quick preset options. Follows Apple design system matching TimePicker.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DatePickerProps {
  /** Current selected date */
  value: Date | null;
  /** Called when date changes */
  onChange: (date: Date) => void;
  /** Optional label text */
  label?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Disabled state */
  disabled?: boolean;
  /** Custom presets */
  presets?: Array<{ date: Date; label: string }>;
}

// Day names
const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Get default presets
const getDefaultPresets = () => {
  const today = new Date();
  return [
    { date: today, label: 'Today' },
    { date: addDays(today, 1), label: 'Tomorrow' },
    { date: addWeeks(today, 1), label: 'Next week' },
  ];
};

export function DatePicker({
  value,
  onChange,
  label = 'Select date',
  minDate,
  disabled = false,
  presets,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value || new Date());
  const activePresets = presets || getDefaultPresets();

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleDaySelect = useCallback(
    (day: Date) => {
      if (minDate && isBefore(day, startOfDay(minDate))) return;
      onChange(day);
    },
    [minDate, onChange]
  );

  const handlePresetSelect = useCallback(
    (preset: { date: Date }) => {
      onChange(preset.date);
      setCurrentMonth(preset.date);
    },
    [onChange]
  );

  const isDateDisabled = useCallback(
    (day: Date) => {
      if (!minDate) return false;
      return isBefore(day, startOfDay(minDate));
    },
    [minDate]
  );

  return (
    <div
      className={clsx(
        'w-72 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="w-4 h-4 text-neutral-400" />
        <span className="text-sm text-neutral-500">{label}</span>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          type="button"
          onClick={handlePrevMonth}
          disabled={disabled}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-neutral-600" />
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.span
            key={format(currentMonth, 'yyyy-MM')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-base font-semibold text-neutral-900"
          >
            {format(currentMonth, 'MMMM yyyy')}
          </motion.span>
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleNextMonth}
          disabled={disabled}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-neutral-600" />
        </motion.button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs font-medium text-neutral-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-7 gap-1 mb-4"
        >
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = value && isSameDay(day, value);
            const isTodayDate = isToday(day);
            const isDisabled = isDateDisabled(day);

            return (
              <motion.button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDaySelect(day)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.008, ease: [0.16, 1, 0.3, 1] }}
                whileHover={isDisabled ? {} : { scale: 1.1 }}
                whileTap={isDisabled ? {} : { scale: 0.95 }}
                disabled={disabled || isDisabled}
                className={clsx(
                  'h-9 rounded-lg text-sm font-medium transition-colors relative',
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : isCurrentMonth
                      ? isDisabled
                        ? 'text-neutral-300 cursor-not-allowed'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      : 'text-neutral-300',
                  isTodayDate && !isSelected && 'ring-1 ring-primary-400'
                )}
              >
                {format(day, 'd')}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Quick Select */}
      <div className="pt-3 border-t border-neutral-100">
        <span className="block text-xs text-neutral-400 mb-2">Quick select</span>
        <div className="flex gap-2">
          {activePresets.map((preset) => {
            const isActive = value && isSameDay(preset.date, value);
            const isPresetDisabled = minDate && isBefore(preset.date, startOfDay(minDate));
            return (
              <motion.button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                whileTap={isPresetDisabled ? {} : { scale: 0.95 }}
                disabled={disabled || !!isPresetDisabled}
                className={clsx(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : isPresetDisabled
                      ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {preset.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Calendar icon
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

// Chevron icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default DatePicker;
