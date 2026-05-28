/**
 * Dropdown Component
 *
 * Dropdown menu with smooth enter/exit animations.
 * Uses Motion One for Apple-style micro-interactions.
 */

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { dropdownVariants, dropdownItemVariants, transitions } from '@/lib/animations';

export type DropdownAlign = 'left' | 'right';

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: DropdownAlign;
  className?: string;
}

export function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ right?: number; left?: number }>({});

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Calculate position to prevent overflow on mobile
  useEffect(() => {
    if (isOpen && menuRef.current && dropdownRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const triggerRect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const padding = 16; // Safe margin from edge

      // Check if menu overflows right edge
      if (align === 'left' && menuRect.right > viewportWidth - padding) {
        setMenuPosition({ right: 0 });
      }
      // Check if menu overflows left edge
      else if (align === 'right' && menuRect.left < padding) {
        // Position relative to trigger, ensuring it doesn't overflow left
        const rightOffset = viewportWidth - triggerRect.right;
        const maxRight = viewportWidth - menuRect.width - padding;
        setMenuPosition({ right: Math.min(rightOffset, -maxRight + triggerRect.right) });
      } else {
        setMenuPosition({});
      }
    }
  }, [isOpen, align]);

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Content with AnimatePresence for exit animations */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            className={clsx(
              'absolute z-50 mt-2 min-w-48 sm:min-w-56 bg-white rounded-xl',
              'shadow-lg border border-neutral-200',
              'overflow-hidden',
              // Mobile: ensure menu doesn't exceed viewport
              'max-w-[calc(100vw-2rem)]',
              // Default positioning (overridden by style when needed)
              !menuPosition.right &&
                !menuPosition.left &&
                (align === 'right' ? 'right-0' : 'left-0')
            )}
            style={menuPosition.right !== undefined ? { right: menuPosition.right } : {}}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dropdown Item with stagger animation
export interface DropdownItemProps {
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function DropdownItem({
  onClick,
  disabled,
  destructive,
  icon,
  children,
}: DropdownItemProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      variants={dropdownItemVariants}
      className={clsx(
        'w-full flex items-center gap-2 px-4 py-3 text-sm text-left min-h-[44px]',
        'transition-colors',
        disabled
          ? 'text-neutral-400 cursor-not-allowed'
          : destructive
            ? 'text-red-600 hover:bg-red-50'
            : 'text-neutral-700 hover:bg-neutral-100'
      )}
      whileHover={disabled ? {} : { x: 2 }}
      transition={transitions.fast}
    >
      {icon && <span className="shrink-0 w-4 h-4">{icon}</span>}
      {children}
    </motion.button>
  );
}

// Dropdown Divider
export function DropdownDivider() {
  return <div className="border-t border-neutral-200 my-1" />;
}

// Dropdown Header (for grouped items)
export function DropdownHeader({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
