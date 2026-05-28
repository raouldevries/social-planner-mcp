# Responsive Implementation Plan

> Mobile (320px-767px) and Tablet (768px-1023px) viewport support for Social Planner

**Created**: 2026-01-16
**Status**: Planning
**Target**: Full responsive support across all viewports

---

## Implementation Workflow

> **IMPORTANT**: Follow this workflow for EVERY step in the plan.

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│  1. READ PLAN                                               │
│     - Review the current step requirements                  │
│     - Understand acceptance criteria and sub-steps          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT WITH /frontend-design                         │
│     - Use `/frontend-design` skill for all UI work          │
│     - Ensures high design quality and production-grade code │
│     - Avoids generic AI aesthetics                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT CODE                                              │
│     - Review against: memory-bank/skills/code-simplifier.md │
│     - Review against: memory-bank/skills/react-best-practices.md │
│     - Apply improvements and simplifications                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UPDATE PROGRESS                                         │
│     - Mark step as completed in Progress Tracking section   │
│     - Add notes about any deviations or learnings           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. ASK FOR CONFIRMATION                                    │
│     - Show summary of completed work                        │
│     - Ask user: "Ready to proceed to the next step?"        │
│     - Wait for explicit approval before continuing          │
└─────────────────────────────────────────────────────────────┘
```

### Audit Files Reference

| File                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `memory-bank/skills/code-simplifier.md`      | Simplification patterns, reducing complexity |
| `memory-bank/skills/react-best-practices.md` | React/component best practices               |

### Quality Gates

Before marking a step complete, verify:

- [ ] `/frontend-design` skill was used for UI implementation
- [ ] Code passes audit against both skills files
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced in existing functionality

---

## Repository Analysis

### Current State Summary

**Architecture**: React SPA with Tailwind CSS, using a desktop-first approach. The app uses Framer Motion for animations and a well-designed component system in `apps/web/src/components/ui/`.

**Responsive Status**: Partially responsive. Some pages (Dashboard, PostList, ArticleList, MediaGrid) have responsive grids, but the core layout shell and complex pages are desktop-only.

### Key Patterns Found

| Pattern                                             | Usage Count    | Files                           |
| --------------------------------------------------- | -------------- | ------------------------------- |
| Responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`) | 46 occurrences | 18 files                        |
| Fixed sidebar width (`w-64`)                        | 2              | Layout.tsx, CalendarSidebar.tsx |
| Fixed grid columns (`grid-cols-3`)                  | 1              | PostEditor.tsx                  |

### Critical Responsive Gaps

1. **Layout.tsx** (lines 233, 306): Fixed `w-64` sidebar and `pl-64` main content padding
2. **PostEditor.tsx** (line 763): Fixed `grid grid-cols-3` - no responsive stacking
3. **Calendar.tsx** (line 309): Uses negative margin hack (`-m-6`) and fixed CalendarSidebar
4. **CalendarSidebar.tsx** (line 128): Fixed `w-64` width

### What's Already Working

- **Dashboard.tsx**: Good responsive grid patterns (`grid-cols-2 lg:grid-cols-4`)
- **PostList.tsx**: Responsive card grid (`md:grid-cols-2 lg:grid-cols-3`)
- **MediaGrid.tsx**: Full responsive grid (`sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`)
- **Modal.tsx**: Centered with `p-4` padding, works on all viewports
- **UI Components**: Size variants (sm/md/lg) support different contexts

### Tailwind Configuration

Uses default breakpoints:

- `sm`: 640px (small tablets/large phones)
- `md`: 768px (tablets)
- `lg`: 1024px (small desktops)
- `xl`: 1280px (large desktops)

Custom spacing, colors, and shadows are well-defined but no responsive-specific extensions.

---

## Implementation Plan

### Phase 1: Foundation - Responsive Layout Shell

**Goal**: Create a responsive navigation system that works across all viewports

#### Step 1.1: Create Mobile Navigation State Management

- **Complexity**: S
- **Acceptance criteria**: Mobile sidebar state is managed globally, persists across route changes
- **Sub-steps**:
  - [ ] Add `isSidebarOpen` state to `apps/web/src/stores/authStore.ts` (or create dedicated `uiStore.ts`)
  - [ ] Create `useSidebar` hook with `open()`, `close()`, `toggle()` methods
  - [ ] Auto-close sidebar on route change using `useLocation` effect

#### Step 1.2: Add Mobile Hamburger Menu Button

- **Complexity**: S
- **Acceptance criteria**: Hamburger button visible on mobile (<1024px), hidden on desktop
- **Sub-steps**:
  - [ ] Create `HamburgerIcon` component in Layout.tsx
  - [ ] Add hamburger button to header: `lg:hidden` visibility
  - [ ] Style: `p-2 rounded-lg hover:bg-neutral-100` with 44px touch target

#### Step 1.3: Make Sidebar Responsive with Drawer Pattern

- **Complexity**: M
- **Acceptance criteria**: Sidebar slides in from left on mobile, always visible on desktop
- **Dependencies**: Steps 1.1, 1.2
- **Sub-steps**:
  - [ ] Change sidebar from `fixed inset-y-0 left-0 w-64` to:
    ```
    fixed inset-y-0 left-0 w-64
    transform transition-transform duration-300 ease-out
    lg:transform-none
    -translate-x-full lg:translate-x-0
    z-40 lg:z-auto
    ```
  - [ ] Add open state: `${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`
  - [ ] Add backdrop overlay for mobile: `fixed inset-0 bg-black/20 lg:hidden` when open
  - [ ] Add click handler on overlay to close sidebar

#### Step 1.4: Update Main Content Area Padding

- **Complexity**: S
- **Acceptance criteria**: Content fills full width on mobile, has left padding on desktop
- **Dependencies**: Step 1.3
- **Sub-steps**:
  - [ ] Change `pl-64` to `lg:pl-64` on main content wrapper
  - [ ] Ensure content has proper mobile padding: `px-4 lg:px-6`

#### Step 1.5: Update Header for Mobile

- **Complexity**: S
- **Acceptance criteria**: Header is functional and readable on mobile
- **Sub-steps**:
  - [ ] Add hamburger button slot: `<div className="lg:hidden">{hamburger}</div>`
  - [ ] Stack user menu on small screens or hide name: `hidden sm:block` for user details
  - [ ] Ensure logout button has adequate touch target: `min-h-[44px]`

---

### Phase 2: Critical Pages - PostEditor & Calendar

**Goal**: Make the two most complex pages functional on mobile/tablet

#### Step 2.1: PostEditor - Convert to Responsive Layout

- **Complexity**: L
- **Acceptance criteria**: Editor usable on 320px viewport, sidebar stacks below content on mobile
- **Sub-steps**:
  - [ ] Change line 763 from `grid grid-cols-3` to:
    ```
    flex flex-col lg:grid lg:grid-cols-3 gap-6
    ```
  - [ ] Change `col-span-2` (line 765) to: `lg:col-span-2`
  - [ ] Reorder DOM so sidebar appears after content on mobile (natural flex order)
  - [ ] Make sidebar sections collapsible on mobile using `<details>` or accordion pattern

#### Step 2.2: PostEditor - Responsive Header Actions

- **Complexity**: M
- **Acceptance criteria**: All action buttons accessible on mobile without horizontal scroll
- **Sub-steps**:
  - [ ] Change header (line 549) from `flex items-center justify-between` to:
    ```
    flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between
    ```
  - [ ] Group action buttons into a dropdown menu on mobile:
    - Primary action (Schedule/Publish) stays visible
    - Secondary actions (Save Draft, Request Review, etc.) go into "More" dropdown
  - [ ] Use `hidden sm:flex` and `sm:hidden` patterns to show/hide button groups

#### Step 2.3: PostEditor - Touch-Friendly Rich Text Editor

- **Complexity**: S
- **Acceptance criteria**: Text editor has proper touch targets, toolbar is usable on mobile
- **Sub-steps**:
  - [ ] Review `RichTextEditor.tsx` toolbar - ensure buttons are minimum 44px touch targets
  - [ ] Consider horizontal scroll for toolbar on mobile if many options
  - [ ] Add `text-base` minimum font size for content area (prevents iOS zoom)

#### Step 2.4: Calendar - Responsive Sidebar as Drawer

- **Complexity**: M
- **Acceptance criteria**: Calendar uses full width on mobile, filters accessible via drawer
- **Sub-steps**:
  - [ ] Change Calendar.tsx line 309 from `flex h-[calc(100vh-4rem)] -m-6` to:
    ```
    flex flex-col lg:flex-row h-[calc(100vh-4rem)] -m-6
    ```
  - [ ] Hide CalendarSidebar on mobile by default: `hidden lg:flex` on `<CalendarSidebar>`
  - [ ] Add floating filter button on mobile: fixed bottom-right, opens sidebar as drawer
  - [ ] Create `CalendarFiltersDrawer` wrapper using existing `CalendarSidebar` content

#### Step 2.5: Calendar - Mobile-Optimized Header

- **Complexity**: S
- **Acceptance criteria**: Navigation and view toggle accessible on mobile
- **Sub-steps**:
  - [ ] Stack header controls on mobile:
    ```
    flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
    ```
  - [ ] Make month navigation touch-friendly: ensure 44px targets
  - [ ] Consider hiding "Share" button text on mobile: icon-only with `sm:hidden` for text

#### Step 2.6: Calendar - FullCalendar Mobile Configuration

- **Complexity**: M
- **Acceptance criteria**: Calendar renders appropriately on mobile with list view option
- **Sub-steps**:
  - [ ] Add `listWeek` plugin from FullCalendar for mobile
  - [ ] Auto-switch to list view on mobile using `window.innerWidth` or media query hook
  - [ ] Adjust `dayMaxEvents` based on viewport: `dayMaxEvents={isMobile ? 2 : 3}`
  - [ ] Ensure event cards don't overflow cell boundaries

---

### Phase 3: Secondary Pages

**Goal**: Ensure all remaining pages are fully responsive

#### Step 3.1: Settings Page Responsive Layout

- **Complexity**: S
- **Acceptance criteria**: Settings tabs and forms work on mobile
- **Sub-steps**:
  - [ ] Review `apps/web/src/pages/Settings.tsx`
  - [ ] Convert any fixed-width containers to responsive
  - [ ] Stack form elements on mobile if using horizontal layouts

#### Step 3.2: Analytics Page Touch Optimization

- **Complexity**: S
- **Acceptance criteria**: Charts are readable on mobile, filters accessible
- **Sub-steps**:
  - [ ] Review chart container sizing in `apps/web/src/pages/Analytics.tsx`
  - [ ] Ensure charts have `min-height` for readability
  - [ ] Stack date range picker and filters on mobile

#### Step 3.3: Social Accounts Page

- **Complexity**: S
- **Acceptance criteria**: Account cards and OAuth buttons work on mobile
- **Sub-steps**:
  - [ ] Review `apps/web/src/pages/SocialAccounts.tsx`
  - [ ] Ensure card grid is responsive: `grid-cols-1 md:grid-cols-2`
  - [ ] Verify OAuth buttons have adequate touch targets

#### Step 3.4: Users Management Page

- **Complexity**: S
- **Acceptance criteria**: User list/table is scrollable on mobile
- **Sub-steps**:
  - [ ] Review `apps/web/src/pages/Users.tsx`
  - [ ] If using table, wrap in horizontal scroll container: `overflow-x-auto`
  - [ ] Consider card layout alternative for mobile

#### Step 3.5: Ambassador Queue Page

- **Complexity**: S
- **Acceptance criteria**: Queue items are readable and actionable on mobile
- **Sub-steps**:
  - [ ] Review `apps/web/src/pages/AmbassadorQueue.tsx`
  - [ ] Stack item details on mobile
  - [ ] Ensure action buttons have 44px minimum touch targets

---

### Phase 4: Polish & Edge Cases

**Goal**: Refine the experience and handle edge cases

#### Step 4.1: Auth Pages Mobile Optimization

- **Complexity**: S
- **Acceptance criteria**: Login/Register forms are centered and readable on mobile
- **Sub-steps**:
  - [ ] Review auth pages: Login, Register, ForgotPassword, ResetPassword
  - [ ] Ensure forms have proper mobile padding: `px-4`
  - [ ] Add `max-w-sm mx-auto` pattern if not present

#### Step 4.2: Dropdown Menus Mobile Positioning

- **Complexity**: S
- **Acceptance criteria**: Dropdowns don't overflow viewport on mobile
- **Sub-steps**:
  - [ ] Review `Dropdown.tsx` positioning logic
  - [ ] Add viewport boundary detection
  - [ ] Consider full-width bottom sheet pattern on mobile

#### Step 4.3: Toast Notifications Mobile Position

- **Complexity**: S
- **Acceptance criteria**: Toasts visible and don't interfere with content on mobile
- **Sub-steps**:
  - [ ] Review toast positioning
  - [ ] Ensure toasts don't cover important UI elements
  - [ ] Add safe area inset padding for notched devices: `pb-safe`

#### Step 4.4: Shared Calendar Public Page

- **Complexity**: S
- **Acceptance criteria**: Public shared calendar view works on mobile
- **Sub-steps**:
  - [ ] Review `apps/web/src/pages/SharedCalendar.tsx`
  - [ ] Apply similar responsive patterns as main Calendar
  - [ ] Ensure the embed modal/overlay is touch-friendly

#### Step 4.5: Global Touch Target Audit

- **Complexity**: M
- **Acceptance criteria**: All interactive elements meet 44px minimum touch target
- **Sub-steps**:
  - [ ] Audit all icon buttons - add padding if needed: `p-2` minimum
  - [ ] Audit checkbox/radio inputs - ensure adequate tap areas
  - [ ] Audit links in text - ensure readable with adequate line height

#### Step 4.6: Viewport Meta & Safe Areas

- **Complexity**: S
- **Acceptance criteria**: App respects device safe areas and has correct viewport settings
- **Sub-steps**:
  - [ ] Verify `index.html` has proper viewport meta tag:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    ```
  - [ ] Add safe area CSS variables support in `index.css`
  - [ ] Apply `pb-safe` to bottom navigation elements

---

## Risk Areas & Recommendations

### Components Requiring Structural Redesign (Not Just CSS)

| Component               | Issue                                                | Recommendation                                                                           |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Layout.tsx**          | Fixed sidebar architecture                           | Implement drawer pattern with state management (Phase 1)                                 |
| **PostEditor.tsx**      | Complex 3-column grid with many conditional sections | Consider mobile-first redesign with collapsible sections; may need dedicated mobile view |
| **CalendarSidebar.tsx** | Fixed width with many filter options                 | Implement as full-screen filter drawer on mobile                                         |
| **RichTextEditor.tsx**  | Complex toolbar with many options                    | Audit toolbar; may need overflow scroll or grouped menus on mobile                       |

### Potential Breaking Changes

1. **Sidebar state** - Adding global state for sidebar will affect all routes; test navigation thoroughly
2. **Grid to flex conversion** - PostEditor layout change could affect spacing/alignment; test all post states
3. **FullCalendar** - Mobile view switch might need plugin additions; verify bundle size impact

### Testing Recommendations

1. Test on actual devices, not just browser DevTools (especially for touch targets)
2. Test with screen readers on mobile (VoiceOver, TalkBack)
3. Test with slow 3G network throttling for loading states
4. Test with keyboard navigation (tablet with external keyboard)
5. Verify landscape orientation doesn't break layouts

### Quick Wins (Can Ship Independently)

1. **Dashboard, PostList, ArticleList** - Already mostly responsive; minor touch target fixes
2. **Auth pages** - Simple forms, likely just need padding adjustments
3. **Modal components** - Already centered and sized appropriately

---

## Progress Tracking

### Phase 1: Foundation

- [x] Step 1.1: Mobile Navigation State Management _(completed 2026-01-17)_
- [x] Step 1.2: Hamburger Menu Button _(completed 2026-01-17)_
- [x] Step 1.3: Responsive Sidebar Drawer _(completed 2026-01-17)_
- [x] Step 1.4: Main Content Padding _(completed 2026-01-17)_
- [x] Step 1.5: Mobile Header _(completed 2026-01-17)_

### Phase 2: Critical Pages

- [x] Step 2.1: PostEditor Responsive Layout _(completed 2026-01-17)_
- [x] Step 2.2: PostEditor Header Actions _(completed 2026-01-17)_
- [x] Step 2.3: Rich Text Editor Touch _(completed 2026-01-17)_
- [x] Step 2.4: Calendar Sidebar Drawer _(completed 2026-01-17)_
- [x] Step 2.5: Calendar Mobile Header _(completed 2026-01-17)_
- [x] Step 2.6: FullCalendar Mobile Config _(completed 2026-01-17)_

### Phase 3: Secondary Pages

- [x] Step 3.1: Settings Page _(completed 2026-01-17)_
- [x] Step 3.2: Analytics Page _(completed 2026-01-17)_
- [x] Step 3.3: Social Accounts Page _(completed 2026-01-17)_
- [x] Step 3.4: Users Page _(completed 2026-01-17)_
- [x] Step 3.5: Ambassador Queue Page _(completed 2026-01-17)_

### Phase 4: Polish

- [x] Step 4.1: Auth Pages _(completed 2026-01-17)_
- [x] Step 4.2: Dropdown Positioning _(completed 2026-01-17)_
- [x] Step 4.3: Toast Positioning _(completed 2026-01-17)_
- [x] Step 4.4: Shared Calendar _(completed 2026-01-17)_
- [x] Step 4.5: Touch Target Audit _(completed 2026-01-17)_
- [x] Step 4.6: Viewport & Safe Areas _(completed 2026-01-17)_
