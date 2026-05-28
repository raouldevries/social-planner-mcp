/**
 * Social Planner - Feedback Submission Popover
 *
 * Positioned near the clicked element. Contains a textarea, screenshot toggle,
 * and submit/cancel buttons. Uses html2canvas for screenshot capture.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/Button';
import { transitions } from '@/lib/animations';
import { useCreateFeedback, useUploadScreenshot } from '@/hooks/useFeedback';
import { useFeedbackMode } from './FeedbackModeContext';

/** Padding from viewport edges */
const VIEWPORT_PADDING = 16;
const POPOVER_WIDTH = 360;
const POPOVER_MAX_HEIGHT = 400;

/**
 * Compute popover position anchored to the selected element rect,
 * flipping if near viewport edges.
 */
function computePosition(rect: DOMRect) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Default: position below and left-aligned with the element
  let top = rect.bottom + 8;
  let left = rect.left;

  // Flip up if not enough space below
  if (top + POPOVER_MAX_HEIGHT > viewportH - VIEWPORT_PADDING) {
    top = rect.top - POPOVER_MAX_HEIGHT - 8;
    // If still off-screen, just pin to top
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    }
  }

  // Clamp horizontal
  if (left + POPOVER_WIDTH > viewportW - VIEWPORT_PADDING) {
    left = viewportW - POPOVER_WIDTH - VIEWPORT_PADDING;
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  return { top, left };
}

export function FeedbackPopover() {
  const { selectedElement, clearSelection, enterFeedbackMode } = useFeedbackMode();
  const createFeedback = useCreateFeedback();
  const uploadScreenshot = useUploadScreenshot();

  const [content, setContent] = useState('');
  const [captureScreenshot, setCaptureScreenshot] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSubmitting = createFeedback.isPending || uploadScreenshot.isPending;

  // Focus textarea when popover opens
  useEffect(() => {
    if (selectedElement && textareaRef.current) {
      // Small delay for animation to start
      const timer = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedElement]);

  const handleCancel = useCallback(() => {
    setContent('');
    setCaptureScreenshot(false);
    clearSelection();
    enterFeedbackMode();
  }, [clearSelection, enterFeedbackMode]);

  // Handle Escape — close popover and re-enter feedback mode
  useEffect(() => {
    if (!selectedElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedElement, handleCancel]);

  const handleSubmit = useCallback(async () => {
    if (!selectedElement || !content.trim()) return;

    let screenshotUrl: string | undefined;

    // Capture screenshot if toggled on
    if (captureScreenshot) {
      setIsCapturing(true);
      try {
        const targetEl = document.querySelector(selectedElement.selector);
        const canvas = await html2canvas((targetEl as HTMLElement) || document.body, {
          useCORS: true,
          scale: 1,
          logging: false,
          width: Math.min((targetEl as HTMLElement)?.offsetWidth || window.innerWidth, 1920),
        });

        // Convert to JPEG for smaller size
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1] ?? '';
        screenshotUrl = await uploadScreenshot.mutateAsync(base64);
      } catch (err) {
        // Screenshot capture failed — submit feedback without it
        console.error('[FeedbackPopover] Screenshot capture failed:', err);
      } finally {
        setIsCapturing(false);
      }
    }

    try {
      await createFeedback.mutateAsync({
        content: content.trim(),
        pageUrl: window.location.pathname,
        elementSelector: selectedElement.selector,
        ...(selectedElement.label ? { elementLabel: selectedElement.label } : {}),
        ...(screenshotUrl ? { screenshotUrl } : {}),
      });

      // Reset and close only on success
      setContent('');
      setCaptureScreenshot(false);
      clearSelection();
    } catch {
      // onError in the mutation hook already shows a toast.
      // Leave popover open so user can retry.
    }
  }, [
    selectedElement,
    content,
    captureScreenshot,
    createFeedback,
    uploadScreenshot,
    clearSelection,
  ]);

  if (!selectedElement) return null;

  const position = computePosition(selectedElement.rect);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-50 w-[360px] bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden"
        style={{ top: position.top, left: position.left }}
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={transitions.fast}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-900">Leave Feedback</h3>
          {selectedElement.label && (
            <p className="text-xs text-neutral-500 mt-0.5">on: {selectedElement.label}</p>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Describe the issue or suggestion..."
            className="w-full h-24 px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-400"
            maxLength={5000}
            disabled={isSubmitting}
          />

          {/* Screenshot toggle */}
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={captureScreenshot}
              onChange={(e) => setCaptureScreenshot(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Capture screenshot</span>
            {isCapturing && <span className="text-xs text-neutral-400">Capturing...</span>}
          </label>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            isLoading={isSubmitting}
          >
            Submit
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
