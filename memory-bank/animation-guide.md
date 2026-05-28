# Social Planner — Animation Implementation Guide

**Version:** 1.0
**Last Updated:** January 2025
**Purpose:** Implementation patterns for React animations using Framer Motion

---

## Executive Summary

Animations in Social Planner serve a functional purpose beyond aesthetics. When a user schedules a post, visual feedback confirms the action succeeded. When navigating between calendar months, smooth transitions maintain spatial context. When approaching character limits, animated warnings draw attention without disrupting the writing flow.

This document provides implementation patterns for animations throughout the application, ensuring consistency with the existing design system while maintaining performance on the target deployment environment. All animations use Framer Motion for React, chosen for its spring physics engine and AnimatePresence system that handles enter/exit transitions elegantly.

The patterns described here integrate with the existing Tailwind CSS color tokens defined in the project configuration and complement the FullCalendar and Tiptap implementations already present in the codebase.

---

## Dependencies

Social Planner uses Framer Motion for declarative animations and Lucide React for consistent iconography throughout the interface. These integrate with the existing React 18 and Tailwind CSS 3.4 stack. Framer Motion's motion components extend native elements with animation capabilities while maintaining full TypeScript support.

---

## 1. Publish Button

The publish action represents a critical user interaction requiring clear state communication. The button cycles through three distinct phases: idle, loading, and success. Each phase provides immediate visual feedback, eliminating uncertainty about whether the action registered.

### State Management

The button maintains a single status state that drives all visual changes. Valid states are "idle", "loading", and "success".

### Button Container

The button wrapper uses Framer Motion's spring physics for tactile hover and press feedback. On hover, the button scales up to 1.03. On tap or click, it scales down to 0.97. The spring transition uses stiffness 400 and damping 17 for a snappy, responsive feel. A minimum width of 140 pixels prevents layout shift as content changes between states. The button is disabled during the loading state to prevent duplicate submissions.

### State Transitions

AnimatePresence with mode "wait" ensures clean transitions between states. Each state renders distinct content with coordinated enter and exit animations.

**Idle State** displays the "Publish" text with a subtle vertical slide. The text enters from below (y offset of 10 pixels) while fading in, and exits upward (y offset of -10 pixels) while fading out.

**Loading State** displays the spinning Loader2 icon from Lucide, providing continuous visual feedback during API communication. The icon fades in and out without positional movement, using the standard Tailwind animate-spin class for rotation.

**Success State** displays a checkmark icon alongside "Done" text with a celebratory scale animation. Content enters at half scale (0.5) and zero opacity, animating to full scale and opacity. The spring transition uses stiffness 300 for a satisfying bounce.

### Click Handler Logic

The handler orchestrates the state sequence, with timing aligned to actual API response patterns in Social Planner. Upon click, the status immediately changes to "loading". After the API responds (approximately 800 milliseconds for typical operations), the status changes to "success". The success state displays for 2000 milliseconds to allow users to register the confirmation, then the status returns to "idle".

---

## 2. Calendar Navigation

The calendar serves as the primary interface for content planning, making smooth navigation essential for maintaining user orientation. When switching between week and month views or moving through time periods, coordinated animations preserve spatial context.

### State Requirements

Navigation state tracks both the current view mode (week or month) and direction of travel (-1 for backward, 0 for neutral, 1 for forward). A week offset counter increments or decrements with each navigation action, providing unique keys for animation transitions. The direction value enables slide animations that reinforce temporal movement: navigating backward slides content right (new content enters from left), while navigating forward slides content left.

### Navigation Handler

When the user clicks a navigation arrow, the handler sets the direction value and adjusts the week offset accordingly. ChevronLeft and ChevronRight icons from Lucide indicate the navigation controls.

### Grid Transition Animation

The calendar grid animates as a cohesive unit when changing view or time period. AnimatePresence with initial set to false prevents animation on first render, avoiding unnecessary motion when the page loads.

The grid enters from the direction of travel with an x offset of 100 pixels multiplied by the direction value, zero opacity, and (for month view only) a scale of 0.9. It animates to centered position, full opacity, and full scale over 300 milliseconds. On exit, it moves in the opposite direction with the same offset magnitude while fading out.

The month view includes a subtle scale transition that reinforces the sense of viewing a larger time scope, while the week view maintains consistent scale for the tighter focus.

### Cell Stagger Effect

Individual calendar cells animate with a staggered delay, creating a wave effect that guides the eye across the grid. Each cell begins at zero opacity with a y offset of 10 pixels, animating to full opacity and natural position. The delay for each cell equals its index multiplied by 20 milliseconds. This interval is fast enough to feel responsive while still creating a perceptible cascade effect.

### Grid Layout Specifications

The week view displays 7 columns with day abbreviations and content cards. Cell height is 64 pixels to accommodate full post previews with thumbnails, titles, and status badges.

The month view displays 7 columns with 28 day numbers in a compact format. Cell height is 32 pixels, with overflow indicated by "+N more" when multiple posts exist on a single day.

---

## 3. Character Counter

The post editor requires real-time feedback as users approach platform character limits (2,200 for Instagram, 3,000 for LinkedIn). The character counter uses progressive visual warnings that intensify as limits approach, with attention-grabbing animations when exceeded.

### State and Calculations

The component tracks the current text content and calculates a percentage based on current length divided by maximum length, multiplied by 100.

Status thresholds determine visual treatment. At 100% or above, status is "over". From 95% to 99%, status is "critical". From 80% to 94%, status is "warning". Below 80%, status is "safe".

### Progress Bar

The progress bar provides ambient awareness of remaining capacity. A container spans full width with 4 pixels height, gray-700 background, full border radius, and hidden overflow. The fill element animates its width from 0 to the current percentage (capped at 100%). Background color changes based on status: gray-500 for safe, amber-500 for warning, and red-500 for critical or over.

### Counter Display with Attention Animations

The numeric counter uses color and motion to communicate urgency. Text color changes match the progress bar: gray-400 for safe, amber-400 for warning, red-400 for critical, and red-500 for over.

During critical status, the counter pulses with a scale animation cycling between 1 and 1.1, repeating infinitely with a 1-second duration per cycle. When the limit is exceeded, a shake animation moves the counter horizontally through positions 0, -2, 2, -2, 2, and back to 0 pixels over 400 milliseconds. This combination ensures users cannot miss the warning while maintaining readability.

---

## 4. Sidebar Navigation

The sidebar navigation uses a sliding highlight indicator that follows user selection, providing clear visual feedback about the active section while animating smoothly between states.

### Navigation Items

Navigation items align with Social Planner's core sections: Calendar (Calendar icon), Drafts (FileText icon), Analytics (BarChart3 icon), and Settings (Settings icon). An active state index tracks the currently selected item, starting at 0.

### Container Structure

The navigation uses relative and absolute positioning to layer the sliding highlight behind interactive buttons. The container is 192 pixels wide with 8 pixels padding and a gray-800 background with rounded corners.

### Sliding Highlight

The highlight is an absolutely positioned element with 8 pixels inset from left and right edges, 40 pixels height, blue-600 background, and 8 pixels border radius. Its vertical position animates based on the active index multiplied by 44 pixels (accounting for 40 pixels item height plus 4 pixels gap). The spring transition uses stiffness 300 and damping 30 for smooth movement without excessive bounce. Setting initial to false prevents animation on first render.

### Button Items

Each navigation button spans full width at 40 pixels height with horizontal layout, 12 pixels horizontal padding, and relative positioning with z-index 10 to appear above the highlight. On hover, buttons shift 4 pixels to the right.

### Icon Animation

Icons within buttons animate their scale based on active state. Active icons scale to 1.2 with a spring transition (stiffness 400), while inactive icons remain at scale 1. Color changes from gray-400 (inactive) to white (active) accompany the scale change.

---

## 5. Image Upload

The media library supports drag-and-drop image uploads with visual feedback throughout the upload process. The drop zone communicates its interactive state and provides progress feedback during file transfer.

### Upload States

The component tracks four possible states: "idle" (awaiting interaction), "dragging" (user hovering with file), "uploading" (transfer in progress), and "complete" (upload finished). A separate progress value tracks upload completion from 0 to 100.

### Drop Zone Container

The drop zone is styled with a 2-pixel dashed border, 12 pixels border radius, and 32 pixels padding, centered flex layout. On hover start (when idle), the state changes to "dragging". On hover end (when dragging), the state returns to "idle".

During the dragging state, the container scales to 1.02 and the border color changes from gray-600 to blue-500. These animations provide clear visual indication that the zone is ready to receive a file.

### Idle and Dragging States

The Upload icon from Lucide displays at 32 pixels with gray-400 color. During the dragging state, the icon floats upward with a -5 pixel y offset. Instructional text changes from "Click or drag to upload" to "Drop to upload" based on state.

### Upload Progress Indicator

During upload, a circular progress indicator wraps around the Image icon. An SVG element at 64 by 64 pixels contains two circles, both with 28-pixel radius, no fill, and 4-pixel stroke width. The background circle uses gray-700 stroke. The progress circle uses blue-500 stroke with pathLength animated from 0 to the current progress divided by 100. The SVG rotates -90 degrees so progress starts at the top rather than the right.

### Completion State

The success state displays a Check icon in a circular container. The container is 40 by 40 pixels with emerald-500 background. The checkmark enters with a -180 degree rotation and zero scale, animating to zero rotation and full scale with a bouncy spring (stiffness 200). This celebratory animation confirms successful upload.

### Upload Simulation

For development and testing, the upload progress can be simulated by setting state to "uploading", then incrementing progress by 10 every 150 milliseconds until reaching 100, at which point state changes to "complete". A reset function returns state to "idle" and progress to 0.

---

## 6. Skeleton Loading

Skeleton placeholders provide visual structure while content loads, reducing perceived wait time. The shimmer animation suggests ongoing activity, and staggered transitions reveal actual content smoothly.

### Loading State

A boolean loading state controls whether skeletons or actual content display.

### Skeleton Item Structure

Each skeleton placeholder mirrors the layout of actual content. A row contains a 48 by 48 pixel square placeholder (representing an icon or avatar) alongside a column with two rectangular placeholders (representing title and subtitle text). The title placeholder spans 75% width at 16 pixels height. The subtitle placeholder spans 50% width at 12 pixels height. All placeholders use gray-700 background with relative positioning and hidden overflow.

### Shimmer Animation

Each placeholder contains an absolutely positioned gradient element that creates the shimmer effect. The gradient transitions from transparent through gray-600 back to transparent. The element animates horizontally from -100% to 100% position, repeating infinitely with 1.5-second duration and linear easing.

Staggered delays create a wave effect across multiple skeleton items. The first item has no delay, the second delays 100 milliseconds, the third delays 200 milliseconds, and so forth.

### Content Reveal

When loading completes, real content enters with staggered opacity transitions. Each content item begins at zero opacity and animates to full opacity. The delay for each item equals its index multiplied by 100 milliseconds, creating a smooth cascade reveal.

### State Transition

AnimatePresence with mode "wait" ensures clean transitions between skeleton and content states. Skeletons exit with an opacity fade before content items enter with their staggered reveal.

### Content Structure

Actual content items display a 48 by 48 pixel icon container with blue-600 background containing the appropriate platform icon (Instagram or LinkedIn). Adjacent text displays the title in white at small size with medium weight, and the subtitle in gray-400 at extra-small size.

---

## Animation Timing Reference

Consistent timing across animations creates a cohesive feel throughout the application.

**Button hover and tap** uses spring physics, resulting in approximately 200 milliseconds effective duration.

**Button loading phase** displays for 800 milliseconds, matching typical API response time.

**Button success display** remains visible for 2000 milliseconds, providing sufficient time to register confirmation.

**Calendar slide** transitions complete in 300 milliseconds, fast enough to feel responsive.

**Calendar cell stagger** applies 20 milliseconds delay per cell for the wave effect.

**Counter pulse** cycles once per 1000 milliseconds, repeating continuously during critical state.

**Counter shake** completes in 400 milliseconds as a single occurrence when limit is exceeded.

**Sidebar highlight** uses spring physics, resulting in approximately 300 milliseconds for smooth movement.

**Upload progress** increments every 150 milliseconds for smooth arc progression.

**Upload checkmark** spring animation completes in approximately 300 milliseconds with a bouncy feel.

**Skeleton shimmer** cycles once per 1500 milliseconds, repeating continuously during loading.

**Content stagger** applies 100 milliseconds delay per item for the reveal effect.

---

## Spring Configuration Presets

Three spring presets cover the common animation scenarios throughout Social Planner.

### Snappy

For buttons, toggles, and immediate-response interactions, use stiffness 400 with damping 17. This configuration provides quick, responsive feedback without feeling abrupt.

### Smooth

For highlight movements, slides, and navigation transitions, use stiffness 300 with damping 30. Higher damping reduces oscillation, creating fluid motion appropriate for larger movements.

### Bouncy

For success states and celebratory feedback, use stiffness 200 with damping 15. Lower stiffness and damping allow more oscillation, creating a playful, satisfying feel for positive confirmations.

---

## Color Reference

Animation colors integrate with the existing design system tokens defined in the Tailwind configuration.

### Status Colors

These colors align with the post status workflow defined in the application design document.

**Safe** uses gray-500 for backgrounds and gray-400 for text.

**Warning** uses amber-500 for backgrounds and amber-400 for text.

**Critical** uses red-500 for backgrounds and red-400 for text.

**Success** uses emerald-500 for backgrounds and emerald-400 for text.

### Interface Colors

**Primary action** uses blue-600 for the publish button and active navigation highlight.

**Container background** uses gray-800 for card backgrounds and the sidebar.

**Inner container** uses gray-900 for nested elements and input backgrounds.

**Placeholder** uses gray-700 for skeleton backgrounds.

**Shimmer highlight** uses gray-600 for the loading animation peak.

**Border inactive** uses gray-600 for drop zones and inactive inputs.

**Border active** uses blue-500 for drag-active states and focused inputs.

**Text primary** uses white for headings and active labels.

**Text secondary** uses gray-400 for body text and descriptions.

**Text muted** uses gray-500 for placeholders and disabled states.

---

## Icon Reference

All icons source from Lucide React for consistency with existing iconography.

### Navigation

Calendar, FileText, BarChart3, Settings, ChevronLeft, ChevronRight

### Platforms

Instagram, Linkedin, Twitter, Facebook

### Actions

Check, X, Upload, Image, Loader2, GripVertical

### Metrics

Eye, Heart, Share2, Clock, Inbox

---

## Integration Notes

These animation patterns complement existing implementations in Social Planner.

**FullCalendar** integration benefits from the calendar navigation animations, providing smoother transitions during view switches and date navigation that the library's built-in transitions do not cover.

**Tiptap** integration uses the character counter animations alongside the existing editor configuration, with the CharacterCount extension providing the data that drives the animated feedback.

**TanStack Query** loading states pair naturally with skeleton animations, using the isLoading flag to toggle between skeleton placeholders and actual content views.

**Tailwind CSS** color references throughout this guide use the semantic tokens defined in the project's Tailwind configuration, ensuring consistency with the broader design system and enabling theme changes to propagate automatically.

---

_This animation guide provides implementation patterns consistent with Social Planner's visual design language. Animation decisions prioritize functional clarity over decoration, ensuring that motion always serves to communicate state or guide user attention._
