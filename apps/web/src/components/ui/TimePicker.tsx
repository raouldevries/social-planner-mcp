/**
 * Button Grid Time Picker
 *
 * A tap-friendly time picker with a grid of buttons, toggle display,
 * and quick preset options. Follows Apple design system.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

interface TimePickerProps {
  /** Current hours value (0-23) */
  hours: number;
  /** Current minutes value (0-59) */
  minutes: number;
  /** Called when time changes */
  onChange: (hours: number, minutes: number) => void;
  /** Optional label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom presets */
  presets?: Array<{ hours: number; minutes: number; label: string }>;
}

// Data arrays
const hoursArray = Array.from({ length: 24 }, (_, i) => i);
const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Default presets
const defaultPresets = [
  { hours: 9, minutes: 0, label: '9:00' },
  { hours: 12, minutes: 0, label: '12:00' },
  { hours: 15, minutes: 0, label: '15:00' },
  { hours: 18, minutes: 0, label: '18:00' },
];

// Format number with leading zero
const formatNumber = (num: number): string => num.toString().padStart(2, '0');

type ActiveColumn = 'hours' | 'minutes';

export function TimePicker({
  hours,
  minutes,
  onChange,
  label = 'Select time',
  disabled = false,
  presets = defaultPresets,
}: TimePickerProps) {
  const [activeColumn, setActiveColumn] = useState<ActiveColumn>('hours');

  const handleHourSelect = useCallback(
    (hour: number) => {
      onChange(hour, minutes);
      setActiveColumn('minutes'); // Auto-advance to minutes
    },
    [minutes, onChange]
  );

  const handleMinuteSelect = useCallback(
    (minute: number) => {
      onChange(hours, minute);
    },
    [hours, onChange]
  );

  const handlePresetSelect = useCallback(
    (preset: { hours: number; minutes: number }) => {
      onChange(preset.hours, preset.minutes);
    },
    [onChange]
  );

  const currentValues = activeColumn === 'hours' ? hoursArray : minutesArray;
  const currentValue = activeColumn === 'hours' ? hours : minutes;
  const handleSelect = activeColumn === 'hours' ? handleHourSelect : handleMinuteSelect;

  return (
    <div
      className={clsx(
        'w-72 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="w-4 h-4 text-neutral-400" />
        <span className="text-sm text-neutral-500">{label}</span>
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <motion.button
          type="button"
          onClick={() => setActiveColumn('hours')}
          className={clsx(
            'px-3 py-2 rounded-xl text-4xl font-bold tabular-nums transition-colors',
            activeColumn === 'hours'
              ? 'bg-primary-50 text-primary-600'
              : 'text-neutral-300 hover:text-neutral-400'
          )}
          whileTap={{ scale: 0.95 }}
          disabled={disabled}
        >
          {formatNumber(hours)}
        </motion.button>

        <span className="text-4xl font-bold text-neutral-300">:</span>

        <motion.button
          type="button"
          onClick={() => setActiveColumn('minutes')}
          className={clsx(
            'px-3 py-2 rounded-xl text-4xl font-bold tabular-nums transition-colors',
            activeColumn === 'minutes'
              ? 'bg-primary-50 text-primary-600'
              : 'text-neutral-300 hover:text-neutral-400'
          )}
          whileTap={{ scale: 0.95 }}
          disabled={disabled}
        >
          {formatNumber(minutes)}
        </motion.button>
      </div>

      {/* Value Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeColumn}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-6 gap-1 mb-4"
        >
          {currentValues.map((value, index) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={disabled}
              className={clsx(
                'h-10 rounded-lg text-sm font-medium transition-colors',
                currentValue === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              )}
            >
              {formatNumber(value)}
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Quick Select */}
      <div className="pt-3 border-t border-neutral-100">
        <span className="block text-xs text-neutral-400 mb-2">Quick select</span>
        <div className="flex gap-2">
          {presets.map((preset) => {
            const isActive = preset.hours === hours && preset.minutes === minutes;
            return (
              <motion.button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                className={clsx(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
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

// Clock icon
function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export default TimePicker;
