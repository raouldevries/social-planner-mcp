/**
 * Segmented Control
 *
 * Apple-style segmented control for switching between options.
 * Uses Motion for smooth spring animations.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  const activeIndex = options.findIndex((opt) => opt.value === value);

  // Update indicator position
  const updateIndicator = useCallback(() => {
    if (!containerRef.current || activeIndex < 0) return;

    const container = containerRef.current;
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-segment-button]');
    const activeButton = buttons[activeIndex];

    if (!activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    const left = buttonRect.left - containerRect.left;
    const width = buttonRect.width;

    setIndicatorStyle({ left, width });
    if (!mounted) setMounted(true);
  }, [activeIndex, mounted]);

  // Initial position and on value change
  useEffect(() => {
    // Small delay to ensure buttons are rendered
    requestAnimationFrame(() => {
      updateIndicator();
    });
  }, [updateIndicator]);

  // Handle resize
  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const sizeClasses = {
    sm: 'h-7 text-xs',
    md: 'h-8 text-sm',
  };

  const paddingClasses = {
    sm: 'px-2.5',
    md: 'px-3',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center rounded-lg bg-gray-100 p-1 ${className}`}
      role="radiogroup"
    >
      {/* Sliding indicator */}
      <motion.div
        className="absolute top-1 bg-white rounded-md shadow-sm"
        style={{ height: 'calc(100% - 8px)' }}
        initial={false}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          opacity: mounted ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
        aria-hidden="true"
      />

      {/* Buttons */}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            data-segment-button
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`
              relative z-10 ${sizeClasses[size]} ${paddingClasses[size]}
              font-medium rounded-md transition-colors duration-150
              ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
