/**
 * Badge Component
 *
 * Status indicators and labels.
 */

import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'draft'
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  // Post status variants
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-violet-100 text-violet-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  draft: 'bg-gray-500',
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  scheduled: 'bg-violet-500',
  published: 'bg-green-500',
  rejected: 'bg-red-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ variant = 'default', size = 'sm', dot, className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}

// Status Badge helper
export type PostStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'UNPUBLISHED';

const statusConfig: Record<PostStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: 'draft', label: 'Draft' },
  PENDING_APPROVAL: { variant: 'pending', label: 'Pending' },
  APPROVED: { variant: 'approved', label: 'Approved' },
  SCHEDULED: { variant: 'scheduled', label: 'Scheduled' },
  PUBLISHED: { variant: 'published', label: 'Published' },
  REJECTED: { variant: 'rejected', label: 'Rejected' },
  UNPUBLISHED: { variant: 'danger', label: 'Unpublished' },
};

export interface StatusBadgeProps {
  status: PostStatus;
  size?: BadgeSize;
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'sm', showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={showDot}>
      {config.label}
    </Badge>
  );
}

// Status Indicator - Apple-style minimal dot + text (no pill background)
const statusIndicatorDotColors: Record<PostStatus, string> = {
  DRAFT: 'bg-gray-400',
  PENDING_APPROVAL: 'bg-amber-500',
  APPROVED: 'bg-blue-500',
  SCHEDULED: 'bg-violet-500',
  PUBLISHED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  UNPUBLISHED: 'bg-red-500',
};

const statusIndicatorLabels: Record<PostStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  UNPUBLISHED: 'Unpublished',
};

export interface StatusIndicatorProps {
  status: PostStatus;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <span
        className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', statusIndicatorDotColors[status])}
      />
      <span className="text-sm text-gray-500 font-normal">{statusIndicatorLabels[status]}</span>
    </span>
  );
}

// Platform Badge helper
export type Platform = 'INSTAGRAM' | 'LINKEDIN';

const platformConfig: Record<Platform, { label: string; bgColor: string; textColor: string }> = {
  INSTAGRAM: { label: 'Instagram', bgColor: 'bg-pink-100', textColor: 'text-pink-700' },
  LINKEDIN: { label: 'LinkedIn', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
};

export interface PlatformBadgeProps {
  platform: Platform;
  size?: BadgeSize;
}

export function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const config = platformConfig[platform];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      {config.label}
    </span>
  );
}
