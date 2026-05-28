/**
 * SuccessLoadingButton Component
 *
 * A polished "Publish" button that cycles through four states with smooth animations:
 * idle → loading → success/error → idle
 *
 * Features:
 * - Spring-based hover/press interactions
 * - Bouncing dots loading animation
 * - Checkmark draw animation for success
 * - X icon with shake animation for error
 * - Auto-transitions between states
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { clsx } from 'clsx';
import { ease } from '@/lib/animations';

// ============================================================================
// Type Definitions
// ============================================================================

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

/** Callback to update loading text and progress during async operations */
export type ProgressReporter = (text: string, progress?: number) => void;

interface SuccessLoadingButtonProps {
  /** Called when button is clicked in idle state. Optionally receives a progress reporter. */
  onClick?: (reportProgress: ProgressReporter) => void | Promise<void>;
  /** Called when an error occurs, receives the error message */
  onError?: (message: string) => void;
  /** Optional className for custom styling */
  className?: string;
  /** Text to display in idle state */
  idleText?: string;
  /** Text to display in success state */
  successText?: string;
  /** Text to display in error state */
  errorText?: string;
  /** Disable the button entirely */
  disabled?: boolean;
}

// ============================================================================
// Animation Constants
// ============================================================================

/**
 * Spring configuration for snappy interactions.
 * High stiffness + moderate damping = quick response without bounce.
 */
const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

/**
 * Text transition for fade + slide effect.
 */
const textTransition: Transition = {
  duration: 0.2,
  ease: ease.outExpo,
};

// ============================================================================
// Sub-components
// ============================================================================

/** Single bouncing dot with staggered delay */
function BouncingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: 1,
        y: [0, -6, 0],
      }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.15 },
        y: {
          duration: 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
      }}
      className="w-1.5 h-1.5 bg-white rounded-full"
    />
  );
}

/** Three bouncing dots for loading state */
function LoadingDots() {
  return (
    <motion.div
      className="flex items-center justify-center gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Stagger: each dot delayed by 0.1s from the previous */}
      <BouncingDot delay={0} />
      <BouncingDot delay={0.1} />
      <BouncingDot delay={0.2} />
    </motion.div>
  );
}

/** Animated checkmark icon for success state */
function SuccessCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: ease.outExpo,
      }}
      className="flex items-center justify-center"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Checkmark with draw effect - stroke appears progressively */}
        <motion.path
          d="M5 13l4 4L19 7"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.3, ease: 'easeOut' },
            opacity: { duration: 0.1 },
          }}
        />
      </svg>
    </motion.div>
  );
}

/** Animated X icon for error state */
function ErrorX() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: ease.outExpo,
      }}
      className="flex items-center justify-center"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* X with draw effect */}
        <motion.path
          d="M6 6l12 12M6 18L18 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.3, ease: 'easeOut' },
            opacity: { duration: 0.1 },
          }}
        />
      </svg>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SuccessLoadingButton({
  onClick,
  onError,
  className,
  idleText = 'Publish',
  successText = 'Done',
  errorText = 'Failed',
  disabled = false,
}: SuccessLoadingButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Handle automatic state transitions (only for success/error → idle)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (state === 'success' || state === 'error') {
      // Reset to idle after 2 seconds
      timer = setTimeout(() => {
        setState('idle');
        setLoadingText(null);
        setProgress(0);
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [state]);

  const handleClick = async () => {
    if (state !== 'idle' || disabled) return;

    setState('loading');
    setLoadingText(null);
    setProgress(0);

    const reportProgress: ProgressReporter = (text, prog) => {
      setLoadingText(text);
      if (prog !== undefined) setProgress(prog);
    };

    // Call the onClick handler if provided
    if (onClick) {
      try {
        await onClick(reportProgress);
        // Only set success if the promise resolves
        setProgress(100);
        setState('success');
      } catch (error) {
        // On error, show error state
        setState('error');
        setProgress(0);
        // Call onError callback with the error message
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        if (onError) {
          onError(errorMessage);
        }
        console.error('Button action failed:', error);
      }
    } else {
      // No onClick provided, just show success after a brief delay
      setTimeout(() => setState('success'), 500);
    }
  };

  const isDisabled = state !== 'idle' || disabled;
  const isError = state === 'error';

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      initial={{ scale: 1, x: 0 }}
      whileHover={isDisabled ? {} : { scale: 1.05 }}
      whileTap={isDisabled ? {} : { scale: 0.95 }}
      animate={
        isError
          ? { x: [0, -4, 4, -4, 4, 0], scale: 1 } // Shake animation for error
          : { x: 0, scale: 1 }
      }
      transition={
        isError
          ? { x: { duration: 0.4, ease: 'easeInOut' }, scale: springTransition }
          : springTransition
      }
      className={clsx(
        // Base styles - matching Button size="sm"
        'relative px-3 py-1.5 rounded-lg font-medium text-xs',
        'min-w-[90px] min-h-[32px]',
        'flex items-center justify-center',
        // Colors - error state uses red, otherwise primary
        isError ? 'bg-red-500 text-white' : 'bg-primary-500 text-white',
        // Focus ring
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isError ? 'focus-visible:ring-red-500' : 'focus-visible:ring-primary-500',
        // Disabled state
        isDisabled && 'cursor-not-allowed',
        // Transition for background color
        'transition-colors duration-200',
        // Custom classes
        className
      )}
    >
      {/* AnimatePresence handles exit animations for state transitions */}
      {/* Using mode="popLayout" to prevent empty state during fast transitions */}
      <AnimatePresence mode="popLayout" initial={false}>
        {state === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={textTransition}
            className="flex items-center justify-center"
          >
            {idleText}
          </motion.span>
        )}

        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={textTransition}
          >
            {loadingText ? (
              <span className="flex items-center gap-1.5">
                <motion.span
                  className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                />
                {loadingText}
              </span>
            ) : (
              <LoadingDots />
            )}
          </motion.div>
        )}

        {state === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={textTransition}
            className="flex items-center justify-center gap-1.5"
          >
            <SuccessCheckmark />
            {successText}
          </motion.span>
        )}

        {state === 'error' && (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={textTransition}
            className="flex items-center justify-center gap-1.5"
          >
            <ErrorX />
            {errorText}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Progress bar — visible during loading when progress is reported */}
      <AnimatePresence>
        {state === 'loading' && progress > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 rounded-b-lg overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="h-full bg-white/60 rounded-b-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default SuccessLoadingButton;
