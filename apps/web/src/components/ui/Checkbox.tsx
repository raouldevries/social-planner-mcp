/**
 * Checkbox Component
 *
 * Custom styled checkbox input.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex items-center min-h-[44px]">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={clsx(
            'h-5 w-5 rounded border-gray-300 text-primary-600',
            'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
            error && 'border-red-300',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'ml-2.5 text-sm text-gray-700 cursor-pointer select-none',
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

Checkbox.displayName = 'Checkbox';
