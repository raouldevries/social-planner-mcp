/**
 * Social Planner - Feedback Mode Banner
 *
 * Shows a fixed banner at the top of the viewport when feedback mode is active.
 */

import { motion, AnimatePresence } from 'motion/react';
import { transitions } from '@/lib/animations';
import { useFeedbackMode } from './FeedbackModeContext';

export function FeedbackModeBanner() {
  const { isFeedbackMode, exitFeedbackMode } = useFeedbackMode();

  return (
    <AnimatePresence>
      {isFeedbackMode && (
        <motion.div
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 h-10 bg-primary-600 text-white text-sm font-medium shadow-lg"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={transitions.fast}
        >
          <span>Click on a section to leave feedback</span>
          <button
            onClick={exitFeedbackMode}
            className="px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
