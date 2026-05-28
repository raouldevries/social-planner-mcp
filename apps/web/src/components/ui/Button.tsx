/**
 * Button Component
 *
 * Refined button with Apple-inspired design.
 *
 * Design principles:
 * - Touch-friendly: Minimum 44px tap targets
 * - Subtle depth: Natural shadows that respond to interaction
 * - Meaningful motion: Smooth, physical-feeling transitions
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-blue-600 text-white',
    'hover:bg-blue-700 active:bg-blue-800',
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    'hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
    'focus-visible:ring-blue-500'
  ),
  secondary: clsx(
    'bg-white text-gray-700',
    'border border-gray-200',
    'hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100',
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    'focus-visible:ring-blue-500'
  ),
  danger: clsx(
    'bg-red-600 text-white',
    'hover:bg-red-700 active:bg-red-800',
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    'focus-visible:ring-red-500'
  ),
  ghost: clsx(
    'bg-transparent text-gray-600',
    'hover:bg-gray-100 active:bg-gray-200',
    'focus-visible:ring-gray-500'
  ),
  link: clsx(
    'bg-transparent text-blue-600',
    'hover:text-blue-700 active:text-blue-800',
    'hover:underline underline-offset-2',
    'focus-visible:ring-blue-500',
    'p-0'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs min-h-[36px] sm:min-h-[32px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px] sm:min-h-[40px]',
  lg: 'px-5 py-3 text-base min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'rounded-lg font-medium',
          'select-none',
          // Smooth transitions with Apple-style easing
          'transition-all duration-200 ease-out',
          // Focus styles - consistent ring
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          // Disabled state
          'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
          // Active state - subtle press effect
          'active:scale-[0.98]',
          // Apply variant and size styles
          variant !== 'link' && sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : leftIcon ? (
          <span className="shrink-0 -ml-0.5">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="shrink-0 -mr-0.5">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
