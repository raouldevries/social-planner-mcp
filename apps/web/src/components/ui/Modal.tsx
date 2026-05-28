/**
 * Modal Component
 *
 * Dialog overlay with Apple-inspired frosted glass backdrop.
 *
 * Design principles:
 * - Backdrop blur creates depth and focus
 * - Smooth, physical-feeling animations with Motion
 * - Subtle shadows for natural elevation
 * - Clean, minimal header design
 */

import { type ReactNode, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Button } from './Button';
import { backdropVariants, modalVariants, transitions, ease } from '@/lib/animations';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  title,
  description,
  children,
  footer,
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - frosted glass effect */}
          <motion.div
            className={clsx('fixed inset-0 z-50', 'bg-neutral-900/20 backdrop-blur-sm')}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: ease.outExpo }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className={clsx(
                'relative w-full pointer-events-auto flex flex-col',
                // Card styling
                'bg-white rounded-2xl',
                'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]',
                'border border-neutral-200/50',
                // Size & max height
                'max-h-[calc(100vh-2rem)]',
                sizeStyles[size]
              )}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || description) && (
                <div className="px-6 pt-6 pb-4">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-neutral-900 tracking-tight"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{description}</p>
                  )}
                </div>
              )}

              {/* Body */}
              <div
                className={clsx(
                  'px-6 overflow-hidden flex-1 min-h-0',
                  // Add top padding if no header
                  !title && !description && 'pt-6',
                  // Add bottom padding if no footer
                  !footer && 'pb-6'
                )}
              >
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 mt-2 border-t border-neutral-100 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}

              {/* Close button */}
              {showCloseButton && (
                <motion.button
                  onClick={onClose}
                  className={clsx(
                    'absolute top-4 right-4',
                    'p-2 rounded-full',
                    'text-neutral-400 hover:text-neutral-600',
                    'hover:bg-neutral-100 active:bg-neutral-200',
                    'transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close"
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
                </motion.button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal helper
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-neutral-600 leading-relaxed">{message}</p>
    </Modal>
  );
}
