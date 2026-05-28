/**
 * AutoSaveIndicator
 *
 * Visual feedback for auto-save status with smooth animations.
 * Displays saving spinner, saved checkmark, error state, and offline indicator.
 */

import { motion, AnimatePresence } from 'motion/react';
import type { AutosaveStatus } from '@/hooks/useAutosave';

// ============================================
// TYPES
// ============================================

interface AutoSaveIndicatorProps {
  status: AutosaveStatus;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

// ============================================
// ANIMATION CONFIG
// ============================================

const fadeTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

const bounceTransition = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
};

// ============================================
// COMPONENT
// ============================================

export function AutoSaveIndicator({
  status,
  error,
  onRetry,
  className = '',
}: AutoSaveIndicatorProps) {
  // Don't render anything in idle state
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <AnimatePresence mode="wait">
        {status === 'saving' && (
          <motion.div
            key="saving"
            {...fadeTransition}
            className="flex items-center gap-1.5 text-gray-400"
          >
            <SpinnerIcon className="w-3.5 h-3.5" />
            <span>Saving...</span>
          </motion.div>
        )}

        {status === 'saved' && (
          <motion.div
            key="saved"
            {...bounceTransition}
            className="flex items-center gap-1.5 text-emerald-500"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Saved</span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            {...fadeTransition}
            className="flex items-center gap-1.5 text-red-500"
          >
            <AlertIcon className="w-3.5 h-3.5" />
            <span>{error || 'Failed to save'}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-1 underline hover:no-underline focus:outline-none"
              >
                Retry
              </button>
            )}
          </motion.div>
        )}

        {status === 'offline' && (
          <motion.div
            key="offline"
            {...fadeTransition}
            className="flex items-center gap-1.5 text-amber-500"
          >
            <WifiOffIcon className="w-3.5 h-3.5" />
            <span>Offline</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </motion.svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-.707-.707m.707.707L3 21m2.929-2.929l2.828-2.828m0 0a3 3 0 014.243 0m-4.243 0L3 10.5M21 13.5a9 9 0 00-2.636-6.364M12 12h.01"
      />
    </svg>
  );
}
