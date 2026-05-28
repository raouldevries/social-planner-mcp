/**
 * Animation Utilities
 *
 * Centralized animation presets using Motion One.
 * Matches the Apple-inspired easing curves from tailwind.config.js
 */

import type { Transition, Variants } from 'motion/react';

// Apple-style easing curves (matching tailwind.config.js)
export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as const, // Snappy, Apple-style
  inExpo: [0.7, 0, 0.84, 0] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  default: [0.4, 0, 0.2, 1] as const, // Standard ease-out
};

// Standard durations (matching CSS custom properties)
export const duration = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
};

// Pre-built transitions
export const transitions = {
  fast: {
    duration: duration.fast,
    ease: ease.outExpo,
  } as Transition,
  normal: {
    duration: duration.normal,
    ease: ease.outExpo,
  } as Transition,
  slow: {
    duration: duration.slow,
    ease: ease.outExpo,
  } as Transition,
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  } as Transition,
  springBouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 25,
  } as Transition,
};

// Fade animation variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale + fade animation (for modals, cards)
export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
  },
};

// Slide up animation (for toasts, dropdowns from bottom)
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 8,
  },
};

// Slide down animation (for dropdowns)
export const slideDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

// Modal specific variants (combines scale + slight slide)
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
};

// Backdrop variants
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Dropdown menu variants with stagger for children
export const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -4,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: duration.normal,
      ease: ease.outExpo,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: {
      duration: duration.fast,
      ease: ease.inExpo,
    },
  },
};

// Dropdown item variants (for staggered entrance)
export const dropdownItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -4,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
};

// List item variants with stagger
export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

// Hover animation presets (for use with whileHover)
export const hoverScale = {
  scale: 1.02,
  transition: transitions.fast,
};

export const hoverLift = {
  y: -2,
  transition: transitions.fast,
};

// Press/tap animation presets (for use with whileTap)
export const tapScale = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

// Utility: Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Utility: Get transition based on reduced motion preference
export function getTransition(preferred: Transition = transitions.normal): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return preferred;
}
