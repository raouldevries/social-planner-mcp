/**
 * Textarea Component
 *
 * Multi-line text input with auto-resize option.
 */

import { forwardRef, type TextareaHTMLAttributes, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, autoResize, className, onChange, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const handleResize = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [textareaRef, autoResize]);

    useEffect(() => {
      handleResize();
    }, [props.value, handleResize]);

    return (
      <textarea
        ref={textareaRef}
        className={clsx(
          'block w-full rounded-lg border px-3 py-2 text-sm',
          'placeholder-gray-400 transition-colors resize-none',
          'focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          !autoResize && 'resize-y',
          className
        )}
        onChange={(e) => {
          handleResize();
          onChange?.(e);
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
