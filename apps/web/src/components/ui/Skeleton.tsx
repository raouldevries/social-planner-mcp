/**
 * Skeleton Component
 *
 * Loading placeholder with shimmer animation.
 * Provides visual structure while content loads.
 */

import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface SkeletonProps {
  /** Width of the skeleton (default: full width) */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Border radius variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Additional className */
  className?: string;
  /** Animation delay for staggered effects (in seconds) */
  delay?: number;
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 16,
  variant = 'text',
  className,
  delay = 0,
}: SkeletonProps) {
  const borderRadius = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={clsx('relative overflow-hidden bg-gray-200', borderRadius[variant], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* Shimmer gradient overlay */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
        animate={{ x: ['calc(-100%)', 'calc(100%)'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
          delay,
        }}
      />
    </div>
  );
}

/**
 * Skeleton text line with appropriate height
 */
export function SkeletonText({
  lines = 1,
  className,
  delay = 0,
}: {
  lines?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
          delay={delay + i * 0.1}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton avatar (circular)
 */
export function SkeletonAvatar({ size = 40, delay = 0 }: { size?: number; delay?: number }) {
  return <Skeleton width={size} height={size} variant="circular" delay={delay} />;
}

/**
 * Skeleton card with avatar and text
 */
export function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-start gap-4 p-4">
      <SkeletonAvatar size={48} delay={delay} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="60%" delay={delay + 0.1} />
        <Skeleton height={12} width="80%" delay={delay + 0.2} />
      </div>
    </div>
  );
}

/**
 * Skeleton list with staggered animation
 */
export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 0.1} />
      ))}
    </div>
  );
}

/**
 * Skeleton post card (for post lists)
 */
export function SkeletonPostCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <Skeleton width={64} height={64} variant="rounded" delay={delay} />

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <Skeleton width={60} height={20} variant="rounded" delay={delay + 0.05} />
            <Skeleton width={24} height={20} variant="rounded" delay={delay + 0.1} />
          </div>

          {/* Content preview */}
          <div className="space-y-1.5">
            <Skeleton height={14} width="90%" delay={delay + 0.15} />
            <Skeleton height={14} width="70%" delay={delay + 0.2} />
          </div>

          {/* Footer row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <SkeletonAvatar size={16} delay={delay + 0.25} />
              <Skeleton width={80} height={12} delay={delay + 0.3} />
            </div>
            <Skeleton width={100} height={12} delay={delay + 0.35} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton calendar event card
 */
export function SkeletonCalendarEvent({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-2">
      <Skeleton height={10} width="80%" delay={delay} />
      <div className="flex items-center gap-1 mt-1">
        <Skeleton width={12} height={12} variant="circular" delay={delay + 0.05} />
        <Skeleton width={40} height={8} delay={delay + 0.1} />
      </div>
    </div>
  );
}

/**
 * Content reveal wrapper - fades in children when loading completes
 */
export function ContentReveal({
  loading,
  children,
  skeleton,
  delay = 0,
}: {
  loading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  delay?: number;
}) {
  if (loading) {
    return <>{skeleton}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

export default Skeleton;
