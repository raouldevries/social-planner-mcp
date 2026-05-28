/**
 * Social Planner - Feedback Mode Overlay
 *
 * When feedback mode is active, highlights hoverable page sections and
 * captures the clicked element for the feedback popover.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useFeedbackMode, type SelectedElement } from './FeedbackModeContext';

/** CSS selector for elements that can be targeted for feedback */
const FEEDBACK_TARGETS = '[data-feedback-target], section, article';

/**
 * Walk up the DOM tree from the event target to find the nearest
 * meaningful container that can receive feedback.
 */
function findFeedbackTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>(FEEDBACK_TARGETS);
}

/**
 * Build a minimal CSS selector path for an element.
 * Prefers id > data-feedback-target > tag.nth-child.
 */
function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const feedbackTarget = el.getAttribute('data-feedback-target');
  if (feedbackTarget) return `[data-feedback-target="${feedbackTarget}"]`;

  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let segment = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (c) => (c as HTMLElement).tagName === current!.tagName
      );
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(segment);
    current = parent;
  }

  return parts.join(' > ');
}

export function FeedbackModeOverlay() {
  const { isFeedbackMode, selectElement, exitFeedbackMode } = useFeedbackMode();
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);

  // Track mouse movement to highlight feedback targets
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = findFeedbackTarget(e.target);

    if (target === hoveredRef.current) return;
    hoveredRef.current = target;

    if (target) {
      setHighlightRect(target.getBoundingClientRect());
      setHighlightLabel(target.getAttribute('data-feedback-label'));
    } else {
      setHighlightRect(null);
      setHighlightLabel(null);
    }
  }, []);

  // Handle click — swallow all clicks in feedback mode, select if valid target
  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Always prevent underlying UI from activating during feedback mode
      e.preventDefault();
      e.stopPropagation();

      const target = findFeedbackTarget(e.target);
      if (!target) return; // click consumed but no selection made

      const element: SelectedElement = {
        selector: buildSelector(target),
        label: target.getAttribute('data-feedback-label'),
        rect: target.getBoundingClientRect(),
      };
      selectElement(element);
    },
    [selectElement]
  );

  // Handle Escape key — exit feedback mode (unless a modal is open)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Don't interfere with modals — they handle their own Escape
      if (document.querySelector('[aria-modal="true"]')) return;

      e.preventDefault();
      exitFeedbackMode();
    },
    [exitFeedbackMode]
  );

  // Auto-exit feedback mode when a modal opens
  useEffect(() => {
    if (!isFeedbackMode) return;

    const observer = new MutationObserver(() => {
      if (document.querySelector('[aria-modal="true"]')) {
        exitFeedbackMode();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isFeedbackMode, exitFeedbackMode]);

  // Register/cleanup event listeners
  useEffect(() => {
    if (!isFeedbackMode) {
      setHighlightRect(null);
      setHighlightLabel(null);
      hoveredRef.current = null;
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFeedbackMode, handleMouseMove, handleClick, handleKeyDown]);

  if (!isFeedbackMode) return null;

  return (
    <>
      {/* Full-screen overlay to change cursor and intercept clicks */}
      <div className="fixed inset-0 z-50 cursor-crosshair" style={{ pointerEvents: 'none' }} />

      {/* Crosshair cursor override on body */}
      <style>{`body { cursor: crosshair !important; } body * { cursor: crosshair !important; }`}</style>

      {/* Highlight box around hovered element */}
      {highlightRect && (
        <div
          className="fixed z-50 pointer-events-none border-2 border-primary-500 bg-primary-500/10 rounded-lg transition-all duration-100"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        >
          {/* Label tooltip */}
          {highlightLabel && (
            <div className="absolute -top-7 left-0 px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded whitespace-nowrap">
              {highlightLabel}
            </div>
          )}
        </div>
      )}
    </>
  );
}
