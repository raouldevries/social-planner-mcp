/**
 * Social Planner - Feedback Floating Button
 *
 * Fixed bottom-right button that activates feedback mode.
 * Hidden when feedback mode is active or when the popover is showing.
 */

import { motion, AnimatePresence } from 'motion/react';
import { transitions } from '@/lib/animations';
import { useFeedbackMode } from './FeedbackModeContext';

export function FeedbackButton() {
  const { isFeedbackMode, selectedElement, enterFeedbackMode } = useFeedbackMode();

  // Hide when feedback mode is active or popover is showing
  const isVisible = !isFeedbackMode && !selectedElement;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-full shadow-lg hover:shadow-xl transition-colors"
          onClick={enterFeedbackMode}
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={transitions.spring}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Give feedback"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          Feedback
        </motion.button>
      )}
    </AnimatePresence>
  );
}
