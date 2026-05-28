/**
 * Select Component
 *
 * Native select input with consistent styling.
 */

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        autoComplete="off"
        className={clsx(
          'block rounded-lg border px-3 py-2.5 text-sm min-h-[44px] sm:min-h-[40px]',
          'bg-white transition-colors appearance-none cursor-pointer',
          'focus:outline-none focus:ring-1',
          'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")]',
          'bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10',
          '[text-align-last:center]',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
