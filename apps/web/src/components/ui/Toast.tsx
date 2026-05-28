/**
 * Toast Component
 *
 * Custom toast notifications with Motion One animations.
 * Slides in from the right with smooth enter/exit transitions.
 */

import { motion } from 'motion/react';
import { clsx } from 'clsx';
import toast, { Toast as HotToast, Toaster, resolveValue } from 'react-hot-toast';
import { ease } from '@/lib/animations';

// Toast variants for slide-in animation
const toastVariants = {
  hidden: {
    opacity: 0,
    x: 50,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.95,
  },
};

// Icon components
function SuccessIcon() {
  return (
    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function InfoIcon() {
  return (
    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
  );
}

function LoadingIcon() {
  return (
    <div className="flex-shrink-0 w-5 h-5">
      <svg className="animate-spin w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

interface ToastContentProps {
  t: HotToast;
}

function ToastContent({ t }: ToastContentProps) {
  const icon =
    t.type === 'success' ? (
      <SuccessIcon />
    ) : t.type === 'error' ? (
      <ErrorIcon />
    ) : t.type === 'loading' ? (
      <LoadingIcon />
    ) : (
      <InfoIcon />
    );

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate={t.visible ? 'visible' : 'exit'}
      exit="exit"
      transition={{
        duration: 0.25,
        ease: ease.outExpo,
      }}
      className={clsx(
        'flex items-center gap-3 px-4 py-3',
        'bg-white rounded-xl',
        'shadow-lg border border-neutral-200/50',
        'w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[280px] sm:max-w-[400px]'
      )}
    >
      {icon}
      <p className="text-sm text-neutral-700 font-medium">{resolveValue(t.message, t)}</p>
      {t.type !== 'loading' && (
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-auto p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}

/**
 * AnimatedToaster - Drop-in replacement for react-hot-toast Toaster
 * with Motion One animations
 */
export function AnimatedToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{
        top: 16,
        right: 16,
      }}
      toastOptions={{
        duration: 4000,
      }}
    >
      {(t) => <ToastContent key={t.id} t={t} />}
    </Toaster>
  );
}

// Re-export toast for convenience
export { toast };
