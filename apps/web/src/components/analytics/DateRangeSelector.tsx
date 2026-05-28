/**
 * Date Range Selector
 *
 * Preset date ranges and custom date picker for analytics.
 * Uses the custom DatePicker component for consistent styling.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { format, parse } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { DateRangePreset } from '@/hooks/useAnalytics';

interface DateRangeSelectorProps {
  preset: DateRangePreset;
  fromDate: string;
  toDate: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (from: string, to: string) => void;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangeSelector({
  preset,
  fromDate,
  toDate,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(preset === 'custom');
  const [customFrom, setCustomFrom] = useState(fromDate);
  const [customTo, setCustomTo] = useState(toDate);

  // Date picker dropdown state
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Ref for click-outside detection
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Sync state with props when they change externally
  useEffect(() => {
    setShowCustom(preset === 'custom');
  }, [preset]);

  useEffect(() => {
    if (preset !== 'custom') {
      setCustomFrom(fromDate);
      setCustomTo(toDate);
    }
  }, [fromDate, toDate, preset]);

  // Click-outside handler to close date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(event.target as Node)
      ) {
        setShowFromPicker(false);
        setShowToPicker(false);
      }
    };

    if (showFromPicker || showToPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFromPicker, showToPicker]);

  const handlePresetClick = useCallback(
    (newPreset: DateRangePreset) => {
      if (newPreset === 'custom') {
        setShowCustom(true);
        setCustomFrom(fromDate);
        setCustomTo(toDate);
      } else {
        setShowCustom(false);
        onPresetChange(newPreset);
      }
    },
    [fromDate, toDate, onPresetChange]
  );

  const handleApplyCustom = useCallback(() => {
    if (customFrom && customTo) {
      onCustomRangeChange(customFrom, customTo);
    }
  }, [customFrom, customTo, onCustomRangeChange]);

  const handleFromDateChange = useCallback((date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    setCustomFrom(formatted);
    setShowFromPicker(false);
  }, []);

  const handleToDateChange = useCallback((date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    setCustomTo(formatted);
    setShowToPicker(false);
  }, []);

  const displayRange = `${format(new Date(fromDate), 'MMM d, yyyy')} - ${format(new Date(toDate), 'MMM d, yyyy')}`;

  // Parse string dates to Date objects for the DatePicker
  const fromDateValue = customFrom ? parse(customFrom, 'yyyy-MM-dd', new Date()) : null;
  const toDateValue = customTo ? parse(customTo, 'yyyy-MM-dd', new Date()) : null;

  return (
    <div className="space-y-4">
      {/* Preset buttons - pill-shaped segment control */}
      <div
        className="flex flex-wrap items-center gap-4"
        role="group"
        aria-label="Date range presets"
      >
        <span className="text-sm text-neutral-500" id="date-range-label">
          Date Range:
        </span>
        <div className="flex p-1 bg-neutral-100 rounded-xl">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePresetClick(p.value)}
              aria-pressed={preset === p.value}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg',
                'transition-all duration-200 ease-out',
                preset === p.value
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-neutral-600" aria-live="polite">
          {displayRange}
        </span>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div
          ref={pickerContainerRef}
          className="flex flex-wrap items-end gap-4 p-4 bg-neutral-50 rounded-xl"
        >
          {/* From date picker */}
          <div className="relative">
            <label className="block text-xs font-medium text-neutral-500 mb-1">From</label>
            <button
              type="button"
              onClick={() => {
                setShowFromPicker(!showFromPicker);
                if (!showFromPicker) setShowToPicker(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[140px]',
                showFromPicker
                  ? 'bg-primary-50 border-primary-300 text-primary-600'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700',
                !customFrom && 'text-neutral-400'
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">
                {customFrom ? format(new Date(customFrom), 'MMM d, yyyy') : 'Select date'}
              </span>
            </button>

            {showFromPicker && (
              <div className="absolute top-full left-0 mt-2 z-50">
                <DatePicker
                  value={fromDateValue}
                  onChange={handleFromDateChange}
                  label="From date"
                  presets={[]}
                />
              </div>
            )}
          </div>

          {/* To date picker */}
          <div className="relative">
            <label className="block text-xs font-medium text-neutral-500 mb-1">To</label>
            <button
              type="button"
              onClick={() => {
                setShowToPicker(!showToPicker);
                if (!showToPicker) setShowFromPicker(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[140px]',
                showToPicker
                  ? 'bg-primary-50 border-primary-300 text-primary-600'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700',
                !customTo && 'text-neutral-400'
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">
                {customTo ? format(new Date(customTo), 'MMM d, yyyy') : 'Select date'}
              </span>
            </button>

            {showToPicker && (
              <div className="absolute top-full left-0 mt-2 z-50">
                <DatePicker
                  value={toDateValue}
                  onChange={handleToDateChange}
                  label="To date"
                  {...(fromDateValue ? { minDate: fromDateValue } : {})}
                  presets={[]}
                />
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleApplyCustom}
            disabled={!customFrom || !customTo}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustom(false);
              setShowFromPicker(false);
              setShowToPicker(false);
              onPresetChange('last30days');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// Calendar icon component
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
