/**
 * Card Component
 *
 * Container component with Apple-inspired natural shadows.
 *
 * Design principles:
 * - Subtle shadows create depth without heaviness
 * - Clean borders that don't compete with content
 * - Optional hover state for interactive cards
 * - Smooth transitions on all interactions
 */

import { type ReactNode, forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
  children: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const variantStyles: Record<CardVariant, string> = {
  default: clsx(
    'bg-white',
    'border-none',
    'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
  ),
  outlined: clsx('bg-white', 'border border-neutral-200', 'shadow-none'),
  elevated: clsx(
    'bg-white',
    'border-none',
    'shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]'
  ),
  ghost: clsx('bg-transparent', 'border-none', 'shadow-none'),
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      selected = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          // Base styles
          'rounded-xl',
          'transition-all duration-200 ease-out',
          // Variant styles
          variantStyles[variant],
          // Padding
          paddingStyles[padding],
          // Interactive state - shadow-only hover, no borders
          interactive &&
            clsx(
              'cursor-pointer',
              'hover:shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]',
              'active:scale-[0.99]'
            ),
          // Selected state - subtle ring only
          selected && 'ring-2 ring-primary-500/20',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({ title, description, action, className, children }: CardHeaderProps) {
  if (children) {
    return <div className={clsx('mb-4', className)}>{children}</div>;
  }

  return (
    <div className={clsx('flex items-start justify-between mb-4', className)}>
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">{title}</h3>
        )}
        {description && (
          <p className="mt-0.5 text-sm text-neutral-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

// Card Body
export interface CardBodyProps {
  className?: string;
  children: ReactNode;
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={className}>{children}</div>;
}

// Card Footer
export interface CardFooterProps {
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  children: ReactNode;
}

const alignStyles: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

export function CardFooter({ className, align = 'right', children }: CardFooterProps) {
  return (
    <div
      className={clsx(
        'mt-4 pt-4',
        'border-t border-neutral-100',
        'flex items-center gap-3',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  );
}

// Stat Card - specialized card for metrics
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <Card padding="md" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tracking-tight">{value}</p>
          {change && (
            <p
              className={clsx(
                'mt-1 text-xs font-medium',
                change.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change.isPositive ? '+' : ''}
              {change.value}%
            </p>
          )}
        </div>
        {icon && <div className="p-2 bg-neutral-100 rounded-lg text-neutral-500">{icon}</div>}
      </div>
    </Card>
  );
}
