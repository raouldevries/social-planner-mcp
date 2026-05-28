/**
 * Radio Component
 *
 * Custom styled radio input with group support.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="radio"
          id={id}
          className={clsx(
            'h-4 w-4 border-gray-300 text-primary-600',
            'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-300',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'ml-2 text-sm text-gray-700',
              props.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group helper
export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
  error?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  className,
  error,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <div
      className={clsx(
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2',
        className
      )}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          id={`${name}-${option.value}`}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={(e) => onChange?.(e.target.value)}
          label={option.label}
          disabled={option.disabled === true}
          error={error === true}
        />
      ))}
    </div>
  );
}
