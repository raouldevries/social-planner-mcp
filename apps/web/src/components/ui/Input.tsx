/**
 * Input Component
 *
 * Text input with Apple-inspired design featuring subtle depth.
 *
 * Design principles:
 * - Subtle inner shadow creates inset depth
 * - Clean focus states with offset ring
 * - Touch-friendly: Minimum 44px height
 * - Smooth, satisfying transitions
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean;
  inputSize?: InputSize;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-xs min-h-[36px] sm:min-h-[32px]',
  md: 'px-3.5 py-2.5 text-sm min-h-[44px] sm:min-h-[40px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, inputSize = 'md', leftElement, rightElement, className, ...props }, ref) => {
    return (
      <div className="relative">
        {leftElement && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
            {leftElement}
          </div>
        )}
        <input
          ref={ref}
          autoComplete="off"
          className={clsx(
            // Base styles
            'block w-full rounded-lg border bg-white',
            'font-normal text-neutral-900',
            'placeholder:text-neutral-400',
            // Subtle inset shadow for depth
            'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]',
            // Smooth transitions
            'transition-all duration-200 ease-out',
            // Focus states - clean ring with offset
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            // Size variants
            sizeStyles[inputSize],
            // Error vs normal state
            error
              ? clsx('border-red-300', 'focus:border-red-400 focus:ring-red-500/20', 'bg-red-50/50')
              : clsx(
                  'border-neutral-200',
                  'hover:border-neutral-300',
                  'focus:border-primary-400 focus:ring-primary-500/20'
                ),
            // Disabled state
            'disabled:bg-neutral-50 disabled:text-neutral-400',
            'disabled:border-neutral-200 disabled:cursor-not-allowed',
            'disabled:shadow-none',
            // Left/right element padding
            leftElement && 'pl-10',
            rightElement && 'pr-10',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
