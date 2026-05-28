# Plan: Mobile & Tablet Responsive Design

> Make Social Planner fully usable and polished on phones (320–480px) and tablets (768–1024px) across all pages and interactions

| Field   | Value                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Created | 2026-03-03                                                                                                                                   |
| Status  | Planning                                                                                                                                     |
| Target  | Every page works well on mobile (375px+) and tablet (768px+) with no horizontal overflow, touch-friendly interactions, and native-feeling UX |

---

## Table of Contents

1. [Skills & Tools](#skills--tools)
2. [Implementation Workflow](#implementation-workflow)
3. [Context](#context)
4. [Phase 1: Foundation & Responsive Infrastructure](#phase-1-foundation--responsive-infrastructure)
5. [Phase 2: Layout Shell & Navigation](#phase-2-layout-shell--navigation)
6. [Phase 3: Core Pages — Tables & Data Views](#phase-3-core-pages--tables--data-views)
7. [Phase 4: Content Creation — Editors & Forms](#phase-4-content-creation--editors--forms)
8. [Phase 5: Dashboard, Analytics & Charts](#phase-5-dashboard-analytics--charts)
9. [Phase 6: Supporting Pages & Remaining Views](#phase-6-supporting-pages--remaining-views)
10. [Phase 7: Touch Interactions & Mobile UX Polish](#phase-7-touch-interactions--mobile-ux-polish)
11. [Phase 8: Cross-Browser Testing & Final QA](#phase-8-cross-browser-testing--final-qa)
12. [Risk Areas & Recommendations](#risk-areas--recommendations)
13. [Progress Tracking](#progress-tracking)

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Project Skills

| Skill              | Role                                                  |
| ------------------ | ----------------------------------------------------- |
| `/frontend-design` | UI component implementation for responsive layouts    |
| `/webapp-testing`  | Browser-level verification at multiple viewport sizes |

### Audit References

| File                                 | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `CLAUDE.md`                          | Project architecture, patterns, and conventions         |
| `apps/web/tailwind.config.js`        | Tailwind breakpoints, spacing, typography configuration |
| `apps/web/src/index.css`             | Global CSS utilities including safe-area handling       |
| `apps/web/src/components/Layout.tsx` | Main layout shell — sidebar, header, content patterns   |

---

## Implementation Workflow

### Per-Step Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│  1. READ PLAN                                               │
│     - Review the current step requirements                  │
│     - Understand acceptance criteria and sub-steps          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT                                               │
│     - Use `/frontend-design` for responsive component work  │
│     - Use `/audit-loop` Phase 1 (test-first)               │
│     - Verify at 375px, 768px, and 1280px viewports         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against tailwind.config.js, CLAUDE.md│
│     - `/webapp-testing` at mobile + tablet + desktop sizes  │
│     - Verify no horizontal overflow at any breakpoint       │
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
│     - Wait for explicit approval before continuing          │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

- [ ] `/audit-loop` was used for implementation (test-first)
- [ ] `/code-reviewer` audit passed
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced
- [ ] No horizontal overflow at 375px viewport width
- [ ] Touch targets are minimum 44x44px
- [ ] `/webapp-testing` passed at mobile (375px), tablet (768px), desktop (1280px)

---

## Context

### Current State

The codebase has a **solid responsive foundation** but with significant gaps on specific pages:

**What's already working well:**

- Viewport meta tag with `viewport-fit=cover` for notched devices
- Mobile sidebar: hamburger menu → slide-in drawer with backdrop overlay, auto-close on route change (`uiStore.ts`)
- Touch targets: buttons/inputs use `min-h-[44px]` on mobile (Apple HIG compliant)
- Grid pages (Dashboard, PostList, ArticleList, Media): responsive column layouts (1→2→3 cols)
- Calendar: `useIsMobile()` hook forces `listWeek` view on <768px, mobile filter drawer, FAB for creation
- PostEditor: `MobileCollapsible` pattern using `<details>/<summary>` for sections, fixed bottom action bar with `safe-area-bottom`
- Safe area CSS utilities in `index.css` for notched devices
- Recharts uses `<ResponsiveContainer>` for chart sizing
- Dropdown has viewport edge collision detection

**What's NOT working:**

- TopPostsTable (Analytics): table-only, no mobile card view — forces horizontal scroll
- Users/Feedback pages: desktop tables use `min-w-full` which overflows on tablets (768-1024px), though mobile card views exist at `md:hidden`
- No responsive typography scaling between breakpoints
- No tablet-specific optimizations (sidebar behavior, grid column adjustments)
- Inconsistent breakpoint usage: some components switch at `sm:`, others at `md:`, for similar visual patterns
- AmbassadorQueue post cards don't wrap on very small screens
- No PWA manifest or mobile-specific meta tags (theme-color, apple-touch-icon)
- No bottom navigation pattern for mobile (relies on hamburger → sidebar only)

### Key Patterns Found

| Pattern              | Location                                | Description                                                                                        |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Responsive grid      | `PostList.tsx:214`, `Dashboard.tsx:328` | `grid gap-4 md:grid-cols-2 lg:grid-cols-3`                                                         |
| Mobile sidebar       | `Layout.tsx` `<aside>` element          | Fixed overlay with backdrop, `useSidebarAutoClose()` hook                                          |
| Touch targets        | `Button.tsx`, `Input.tsx`               | `min-h-[44px] sm:min-h-[40px]`                                                                     |
| Table/Card switch    | `Users.tsx`, `Feedback.tsx`             | `hidden md:table` + `md:hidden` card view                                                          |
| Mobile collapsible   | `PostEditor.tsx` `MobileCollapsible`    | `<details className="lg:hidden">` on mobile/tablet, `<div className="hidden lg:block">` on desktop |
| Safe area utilities  | `index.css` `.safe-area-x`              | `.safe-area-x`, `.safe-area-bottom` classes                                                        |
| Mobile detection     | `Calendar.tsx` `useIsMobile()`          | Custom hook with `matchMedia` + `window.innerWidth` initial state                                  |
| FAB button           | `Calendar.tsx` create button            | `fixed bottom-6 right-6 lg:hidden` pattern                                                         |
| Viewport collision   | `Dropdown.tsx` `useEffect`              | Dynamic repositioning with 16px padding                                                            |
| Max-width containers | Throughout pages                        | `max-w-4xl`, `max-w-5xl`, `max-w-7xl mx-auto`                                                      |

### Critical Gaps

1. **No `useIsMobile` hook in shared location** — Calendar has its own, but it should be a shared utility for reuse
2. **Table overflow on tablets** — Users/Feedback tables have outer wrappers with `overflow-hidden` that clip content instead of scrolling; card view is hidden above `md:` breakpoint
3. **TopPostsTable has no mobile card view** — Has `overflow-x-auto` fallback (so no overflow bug), but horizontal scroll UX is poor on phones; needs a proper card view for mobile
4. **No tablet sidebar mode** — Could show a collapsed icon-only sidebar on tablets instead of hiding completely
5. **Breakpoint inconsistency** — No documented standard for when to use `sm:` vs `md:` vs `lg:`
6. **Missing PWA essentials** — No manifest.json, theme-color, apple-touch-icon, or standalone display mode

---

## Phase 1: Foundation & Responsive Infrastructure

### Step 1.1: Create shared `useBreakpoint` hook and responsive utilities

**Complexity:** S

**Acceptance criteria:**

- [ ] A `useBreakpoint()` hook exists in `apps/web/src/hooks/useBreakpoint.ts` that returns current breakpoint name (`xs | sm | md | lg | xl | 2xl`)
- [ ] A `useIsMobile()` hook exists in the same file, using `md` (768px) as the breakpoint
- [ ] A `useIsTablet()` hook exists that returns `true` for 768px–1023px range
- [ ] Hooks use `window.matchMedia` for efficient detection (not resize listeners)
- [ ] Calendar.tsx `useIsMobile` is refactored to use the shared hook
- [ ] Hook is SSR-safe (returns sensible defaults when `window` is undefined)

**Sub-steps:**

a. Create `apps/web/src/hooks/useBreakpoint.ts` with `useBreakpoint()`, `useIsMobile()`, `useIsTablet()` hooks
b. Define breakpoint constants matching Tailwind config: `{ sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }`
c. Add `useMediaQuery(query: string)` as a low-level primitive the other hooks build on. For initial state: use `window.matchMedia(query).matches` when `window` is defined, `false` when it is not (SSR safety)
d. Refactor `Calendar.tsx` to import `useIsMobile` from the shared hook instead of its local definition (lines 44–66). The existing Calendar hook uses `window.innerWidth < breakpoint` for initial state — the shared hook should replicate this via `matchMedia(query).matches` which is equivalent

**Files:**

- `apps/web/src/hooks/useBreakpoint.ts` (create)
- `apps/web/src/pages/Calendar.tsx` (modify — remove local `useIsMobile`, import from hook)

**Dependencies:** None

---

### Step 1.2: Add PWA manifest and mobile meta tags

**Complexity:** S

**Acceptance criteria:**

- [ ] `apps/web/public/manifest.json` exists with app name, icons, theme color, and `display: "standalone"`
- [ ] `index.html` has `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable">`, `<link rel="apple-touch-icon">`
- [ ] Theme color matches the app's Tailwind primary-600 value (`#4263d8` from `tailwind.config.js`). Note: `index.css` CSS variables define `--color-primary-600: #2563EB` which conflicts — use the Tailwind config value as the source of truth since it governs all utility classes
- [ ] App icon exists at 192x192 and 512x512 in `apps/web/public/`

**Sub-steps:**

a. Create `apps/web/public/manifest.json` with app name "Social Planner", short_name "Acme", theme_color, background_color, display "standalone", start_url "/"
b. Generate or source app icons at 192x192 and 512x512 (use existing favicon or create simple text-based icon)
c. Add meta tags to `apps/web/index.html`: manifest link, theme-color, apple-mobile-web-app-capable, apple-touch-icon
d. Add `<meta name="apple-mobile-web-app-status-bar-style" content="default">` for iOS status bar

**Files:**

- `apps/web/public/manifest.json` (create)
- `apps/web/index.html` (modify)
- `apps/web/public/icon-192.png` (create)
- `apps/web/public/icon-512.png` (create)

**Dependencies:** None

---

### Step 1.3: Document responsive breakpoint conventions

**Complexity:** S

**Acceptance criteria:**

- [ ] A section is added to `CLAUDE.md` under "Code Patterns" documenting when to use each breakpoint
- [ ] Convention: `sm:` for minor adjustments (padding, gaps), `md:` for layout shifts (table→card, grid columns), `lg:` for sidebar/major layout changes
- [ ] All team members have a reference for consistent breakpoint usage

**Sub-steps:**

a. Add a "Responsive Breakpoint Conventions" section to the project `CLAUDE.md`
b. Document the standard: mobile-first default, `sm:` (640px) for tweaks, `md:` (768px) for tablet layout shifts, `lg:` (1024px) for desktop sidebar/multi-column
c. Document touch target standards: minimum 44x44px on mobile, can reduce to 40px at `sm:` breakpoint

**Files:**

- `CLAUDE.md` (modify — add responsive conventions section)

**Dependencies:** None

---

## Phase 2: Layout Shell & Navigation

### Step 2.1: Add tablet sidebar mode (collapsed icon-only rail)

**Complexity:** M

**Acceptance criteria:**

- [ ] On tablet (768–1023px), sidebar renders as a narrow icon-only rail (w-16 or w-20) instead of being fully hidden
- [ ] Icons are centered in the rail with tooltip labels on hover
- [ ] Active route indicator still works on the rail
- [ ] Tapping an icon navigates to the route (no expand-on-tap needed for MVP)
- [ ] Main content area adjusts padding: `md:pl-16 lg:pl-64` (rail on tablet, full sidebar on desktop)
- [ ] Mobile (<768px) behavior is unchanged: hamburger → overlay drawer
- [ ] Sidebar rail has the same background/border styling as the full sidebar

**Sub-steps:**

a. Add a `isTablet` check in `Layout.tsx` using the new `useIsTablet()` hook
b. Create a `SidebarRail` component (or conditional render within existing sidebar) that shows only icons in a narrow container
c. Update the main content div from `lg:pl-64` to `md:pl-16 lg:pl-64`
d. Add CSS transition so the sidebar width change feels smooth
e. Hide the hamburger button on tablet since the rail is always visible: change `lg:hidden` to `md:hidden` on the hamburger button
f. Add `title` attributes or Tailwind `group-hover` tooltips to rail icons
g. **Calendar layout interaction**: After adding `md:pl-16`, verify Calendar.tsx's negative-margin trick (`-m-6` on the full-bleed calendar wrapper) still works correctly at tablet widths. The `-m-6` cancels the parent's `safe-area-x` padding (24px) but NOT the new `pl-16` (64px). May need a conditional adjustment like `md:-ml-4` on the calendar wrapper at tablet breakpoint

**Files:**

- `apps/web/src/components/Layout.tsx` (modify)
- `apps/web/src/hooks/useBreakpoint.ts` (may need to import)

**Dependencies:** Step 1.1

---

### Step 2.2: Improve mobile header for small screens

**Complexity:** S

**Acceptance criteria:**

- [ ] Header content doesn't overflow on screens as narrow as 320px
- [ ] `PendingActionsIndicator`, user name/role text, and logout button remain accessible and don't wrap
- [ ] Header gap reduces on mobile: `gap-2` default, `sm:gap-4` on larger
- [ ] User name/role text (currently `hidden sm:block`) behavior is preserved — hidden on mobile, visible at `sm:`

**Sub-steps:**

a. Audit the `<header>` element in `Layout.tsx` for overflow at 320px. Note: the current header contains only a hamburger button (left), and a right-side cluster with `PendingActionsIndicator`, user name/role text (`hidden sm:block`), and a logout button. There is NO page title and NO avatar component
b. Ensure the hamburger and right-side cluster use `flex-shrink-0` where appropriate
c. If the logout button text causes overflow at 320px, consider an icon-only logout on mobile
d. Test that all header elements fit at 320px, 375px, and 768px

**Files:**

- `apps/web/src/components/Layout.tsx` (modify — header section)

**Dependencies:** None

---

### Step 2.3: Add mobile bottom navigation bar

**Complexity:** M

**Acceptance criteria:**

- [ ] A bottom navigation bar appears on mobile (<768px) with 4-5 key navigation icons: Dashboard, Calendar, Posts, Media, More
- [ ] "More" opens the full sidebar drawer (same as hamburger)
- [ ] Active route is highlighted in the bottom bar
- [ ] Bottom bar respects `safe-area-bottom` for notched devices
- [ ] Bottom bar is hidden when keyboard is open (input focused)
- [ ] Content area has bottom padding to prevent overlap with the bottom bar
- [ ] Desktop and tablet views are unaffected

**Sub-steps:**

a. Create `apps/web/src/components/BottomNav.tsx` component
b. Define the 5 navigation items with icons (reuse icons from sidebar nav items in `Layout.tsx`)
c. Use `useIsMobile()` hook to conditionally render — only visible below `md` breakpoint
d. Position with `fixed bottom-0 left-0 right-0` and `safe-area-bottom` padding
e. Add `pb-16 md:pb-0` to the main content area in `Layout.tsx` to prevent overlap
f. Detect keyboard open state via `visualViewport` API or input focus to hide the bar
g. Wire "More" item to `useSidebar().toggle` (the `toggle` action from `useSidebar()` hook in `uiStore.ts` — this matches the hamburger button in `Layout.tsx` which uses `toggleSidebar`). Using `.toggle` instead of `.open` ensures the sidebar can be dismissed by tapping "More" again

**Files:**

- `apps/web/src/components/BottomNav.tsx` (create)
- `apps/web/src/components/Layout.tsx` (modify — add BottomNav, adjust content padding)

**Dependencies:** Step 1.1

---

## Phase 3: Core Pages — Tables & Data Views

### Step 3.1: Fix TopPostsTable responsive layout (Analytics)

**Complexity:** S

**Acceptance criteria:**

- [ ] TopPostsTable renders as cards on mobile (<768px) and as a table on tablet+ (≥768px)
- [ ] Mobile cards show the available data fields: post content (truncated), platform badge, and engagement rate. Note: `topPosts` type only has `postId`, `content`, `engagementRate`, `platform` — no thumbnail or metric-type fields exist in the API response
- [ ] Cards follow the same pattern as Users.tsx (`hidden md:table` + `md:hidden` card div)
- [ ] Sorting still works on both views
- [ ] No horizontal overflow at any viewport width

**Sub-steps:**

a. Read `apps/web/src/components/analytics/TopPostsTable.tsx` to understand current table structure
b. Add a mobile card view with `md:hidden` that renders each post as a card with key metrics
c. Wrap the existing table with `hidden md:block`
d. Ensure sort controls work on both views (or simplify to a dropdown on mobile)
e. Test at 375px and 768px

**Files:**

- `apps/web/src/components/analytics/TopPostsTable.tsx` (modify)

**Dependencies:** None

---

### Step 3.2: Fix Users page table overflow on tablets

**Complexity:** S

**Acceptance criteria:**

- [ ] Users table does not horizontally overflow on tablets (768–1024px)
- [ ] Table wraps in `overflow-x-auto` container as a fallback
- [ ] Card view breakpoint is adjusted if needed — consider showing cards below `lg:` instead of `md:` since table is too wide for tablets
- [ ] Role badges and action buttons remain accessible at all sizes

**Sub-steps:**

a. Read `apps/web/src/pages/Users.tsx` — find the outer table container div (has `overflow-hidden` class)
b. **Critical**: Change `overflow-hidden` to `overflow-x-auto` on the existing outer container div. Do NOT add a nested `overflow-x-auto` wrapper inside `overflow-hidden` — the outer `overflow-hidden` would block the inner scroll. The fix is to change the existing class, not add a new wrapper
c. Consider changing the card/table switch from `md:` to `lg:` breakpoint (show cards on tablet too)
d. If keeping table on tablet: reduce column widths, truncate email, hide less important columns
e. Test at 768px, 1024px viewports

**Files:**

- `apps/web/src/pages/Users.tsx` (modify)

**Dependencies:** None

---

### Step 3.3: Fix Feedback page table overflow on tablets

**Complexity:** S

**Acceptance criteria:**

- [ ] Feedback table does not overflow on tablets (768–1024px)
- [ ] Same fix pattern as Users page
- [ ] Mobile card view properly shows feedback content, status badge, and author
- [ ] Inline edit functionality works on mobile cards

**Sub-steps:**

a. Read `apps/web/src/pages/Feedback.tsx` — find the outer table container div (has `overflow-hidden` class, same pattern as Users.tsx)
b. **Critical**: Change `overflow-hidden` to `overflow-x-auto` on the existing outer container div (same fix as Users page — do NOT nest a new wrapper)
c. Verify mobile card view renders feedback content with `line-clamp-3`
d. Test inline edit mode on mobile
e. Test at 375px, 768px, 1024px viewports

**Files:**

- `apps/web/src/pages/Feedback.tsx` (modify)

**Dependencies:** None

---

## Phase 4: Content Creation — Editors & Forms

### Step 4.1: Optimize PostEditor for tablet layout

**Complexity:** M

**Acceptance criteria:**

- [ ] On tablets (768–1023px), PostEditor uses a stacked layout (main editor on top, settings below) instead of the 3-column desktop grid
- [ ] `MobileCollapsible` sections are open by default on tablet (enough screen space)
- [ ] Rich text editor toolbar wraps gracefully without overflow
- [ ] Image/media previews are appropriately sized
- [ ] Fixed bottom action bar is visible on tablet too (or action buttons are placed inline)

**Sub-steps:**

a. Read `PostEditor.tsx` — search for `lg:grid-cols-3` to find the main grid layout (class: `flex flex-col lg:grid lg:grid-cols-3 gap-6`)
b. The current breakpoint (`lg:`) means tablets get the stacked layout — this is correct behavior. Focus on the collapsible sections
c. `MobileCollapsible` uses `<details className="lg:hidden" open={defaultOpen}>` — sections ARE collapsed by default on tablets (768–1023px) since `lg:` = 1024px. **Important**: The native `<details>` element's `open` attribute is only read on mount — React does not re-sync it on prop changes, and `useIsTablet()` returns `false` initially before resolving to `true`. You must convert `MobileCollapsible` from uncontrolled `<details>` to a controlled React state component: use `const [isOpen, setIsOpen] = useState(defaultOpen)` with a `useEffect(() => setIsOpen(defaultOpen), [defaultOpen])` to respond to breakpoint changes. Then render `<details open={isOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>`. Pass `defaultOpen={isTablet}` from the `useIsTablet()` hook
d. Check Tiptap toolbar for overflow at 768px — if overflowing, add `flex-wrap` to toolbar
e. Verify image upload area and media previews scale properly
f. Test the full post creation flow at 768px

**Files:**

- `apps/web/src/pages/PostEditor.tsx` (modify)
- `apps/web/src/components/post/RichTextEditor.tsx` (possibly modify — toolbar wrapping)

**Dependencies:** Step 1.1

---

### Step 4.2: Optimize ArticleEditor for mobile and tablet

**Complexity:** S

**Acceptance criteria:**

- [ ] Article editor form is usable at 375px width
- [ ] Title input, content editor, and metadata fields stack vertically on mobile
- [ ] No horizontal overflow on any form element
- [ ] Save/publish buttons are accessible (fixed bottom bar or prominent placement)

**Sub-steps:**

a. Read `ArticleEditor.tsx` to assess current responsive behavior
b. Verify form fields use full width on mobile
c. If action buttons are not in a fixed bar on mobile, consider adding one (follow `PostEditor.tsx` pattern)
d. Test at 375px and 768px

**Files:**

- `apps/web/src/pages/ArticleEditor.tsx` (modify if needed)

**Dependencies:** None

---

## Phase 5: Dashboard, Analytics & Charts

### Step 5.1: Optimize Dashboard grid for small phones

**Complexity:** S

**Acceptance criteria:**

- [ ] Dashboard stats grid: 2 columns on mobile (already works), but stat values/labels don't truncate or overflow on 320px screens
- [ ] Summary cards (Recent Activity, Upcoming Posts) render cleanly at 375px
- [ ] Quick actions grid is usable on mobile
- [ ] No content is cut off or overflowing

**Sub-steps:**

a. Test Dashboard at 320px and 375px width
b. Check if stat cards have `truncate` on numeric values and labels
c. Verify `max-w-7xl mx-auto` container doesn't cause issues at small widths
d. Ensure padding is reduced on mobile if needed: `px-4` instead of `px-6`

**Files:**

- `apps/web/src/pages/Dashboard.tsx` (modify if issues found)

**Dependencies:** None

---

### Step 5.2: Optimize Analytics page for mobile

**Complexity:** M

**Acceptance criteria:**

- [ ] Platform filter buttons wrap or scroll horizontally without overflow
- [ ] Date range selector is usable on mobile (single-column or stacked inputs)
- [ ] Charts render at full width with appropriate height on mobile (not too tall, not too short)
- [ ] Analytics summary stats are readable at 375px
- [ ] TopPostsTable uses card view on mobile (from Step 3.1)

**Sub-steps:**

a. Read `Analytics.tsx` filter section — verify `overflow-x-auto` on platform buttons works at 375px
b. Check date range inputs — if they're side-by-side, they may need to stack on mobile
c. Verify chart `ResponsiveContainer` fills available width on mobile
d. Test chart readability on small screens — axis labels, legend placement
e. Consider reducing chart height on mobile from `h-80` to `h-60` using responsive classes

**Files:**

- `apps/web/src/pages/Analytics.tsx` (modify)
- `apps/web/src/components/analytics/PlatformChart.tsx` (possibly modify — height)
- `apps/web/src/components/analytics/TimeSeriesChart.tsx` (possibly modify — height)

**Dependencies:** Step 3.1

---

## Phase 6: Supporting Pages & Remaining Views

### Step 6.1: Optimize AmbassadorQueue cards for small screens

**Complexity:** S

**Acceptance criteria:**

- [ ] `QueuePostCard` wraps properly on screens <400px (media preview stacks above content instead of side-by-side)
- [ ] Action buttons (approve/reject) are full-width on mobile
- [ ] Stats grid stacks to single column on mobile (already `grid-cols-1 sm:grid-cols-3` — verify)
- [ ] Invitation cards render cleanly on mobile

**Sub-steps:**

a. Read `AmbassadorQueue.tsx` QueuePostCard layout (line ~238-286)
b. Change card layout from `flex gap-4` (always horizontal) to `flex flex-col sm:flex-row gap-4` (stack on mobile)
c. Make media preview `w-full sm:w-24` and `h-40 sm:h-24` when stacked
d. Verify invitation button cards use `flex-1` on mobile for full-width buttons
e. Test at 375px

**Files:**

- `apps/web/src/pages/AmbassadorQueue.tsx` (modify)

**Dependencies:** None

---

### Step 6.2: Verify and fix SocialAccounts page on mobile

**Complexity:** S

**Acceptance criteria:**

- [ ] Social account connection cards stack vertically on mobile
- [ ] OAuth connect buttons are full-width on mobile
- [ ] Account detail info (username, status, metrics) doesn't overflow
- [ ] Disconnect/reconnect buttons are accessible and not too small

**Sub-steps:**

a. Read `SocialAccounts.tsx` to verify current responsive behavior
b. Test at 375px — fix any overflow or layout issues
c. Ensure buttons are touch-friendly (44px minimum height)

**Files:**

- `apps/web/src/pages/SocialAccounts.tsx` (modify if needed)

**Dependencies:** None

---

### Step 6.3: Verify and fix Settings page on mobile

**Complexity:** S

**Acceptance criteria:**

- [ ] Settings tabs scroll horizontally on mobile (already uses `overflow-x-auto`)
- [ ] Tab content renders cleanly on mobile
- [ ] Form fields in settings panels are full-width on mobile
- [ ] No horizontal overflow on any settings panel

**Sub-steps:**

a. Test Settings page at 375px
b. Verify scrollable tabs work with touch swipe
c. Check each settings tab panel for responsive issues
d. Fix any overflow or layout problems

**Files:**

- `apps/web/src/pages/Settings.tsx` (modify if needed)

**Dependencies:** None

---

### Step 6.4: Optimize modals and dialogs for mobile

**Complexity:** S

**Acceptance criteria:**

- [ ] Modals are full-width on mobile (aside from 16px gutter on each side)
- [ ] Modal max-width is appropriate: `sm` and `md` modals become nearly full-width on phones
- [ ] Modal scroll behavior works on mobile (body scroll locked, modal content scrolls)
- [ ] Confirmation dialogs have touch-friendly buttons
- [ ] Calendar event modal renders cleanly on mobile

**Sub-steps:**

a. Read `Modal.tsx` size variants and mobile behavior
b. Verify `p-4` gutter (16px) is sufficient — may want `p-3` (12px) on very small screens
c. Check body scroll lock behavior — ensure no iOS Safari bouncing issues
d. Test `CalendarEventModal.tsx` at 375px
e. Verify modal close button (X) is touch-friendly

**Files:**

- `apps/web/src/components/ui/Modal.tsx` (modify if needed)
- `apps/web/src/components/calendar/CalendarEventModal.tsx` (modify if needed)

**Dependencies:** None

---

## Phase 7: Touch Interactions & Mobile UX Polish

### Step 7.1: Improve calendar touch interactions

**Complexity:** M

**Acceptance criteria:**

- [ ] Calendar list view on mobile is touch-scrollable with momentum
- [ ] Tapping a calendar event opens the detail modal (not just hover)
- [ ] Swipe gestures for navigating between weeks/months work smoothly (FullCalendar native)
- [ ] "Today" button is prominent and easily tappable
- [ ] Mobile calendar header (date, nav arrows) doesn't overflow on 375px

**Sub-steps:**

a. Test Calendar page on a real mobile device or mobile simulator at 375px
b. Verify FullCalendar touch event handling — tap to open, swipe to navigate
c. Check if the calendar toolbar overflows — if so, reduce button spacing or use icon-only buttons on mobile
d. Ensure the filter FAB doesn't overlap with calendar content
e. Test creating a new post from the mobile FAB flow

**Files:**

- `apps/web/src/pages/Calendar.tsx` (modify if needed)
- `apps/web/src/index.css` (modify if FullCalendar mobile overrides needed)

**Dependencies:** None

---

### Step 7.2: Add responsive typography scaling

**Complexity:** S

**Acceptance criteria:**

- [ ] Page titles use `text-xl sm:text-2xl` instead of fixed sizes
- [ ] Section headings use `text-lg sm:text-xl` pattern
- [ ] Body text remains `text-sm` or `text-base` consistently
- [ ] At 375px, all text is readable without horizontal scrolling
- [ ] Changes are applied consistently across all pages

**Sub-steps:**

a. Audit all page-level heading sizes across pages (Dashboard, Calendar, PostList, etc.)
b. Create a consistent pattern: page title = `text-xl sm:text-2xl`, section title = `text-lg sm:text-xl`, body = `text-sm`
c. Apply responsive typography to all page headers
d. Verify no text overflow at 320px

**Files:**

- `apps/web/src/pages/Dashboard.tsx` (modify)
- `apps/web/src/pages/Calendar.tsx` (modify)
- `apps/web/src/pages/PostList.tsx` (modify)
- `apps/web/src/pages/ArticleList.tsx` (modify)
- `apps/web/src/pages/Analytics.tsx` (modify)
- `apps/web/src/pages/Media.tsx` (modify)
- `apps/web/src/pages/SocialAccounts.tsx` (modify)
- `apps/web/src/pages/Settings.tsx` (modify)
- `apps/web/src/pages/Users.tsx` (modify)
- `apps/web/src/pages/AmbassadorQueue.tsx` (modify)
- `apps/web/src/pages/Feedback.tsx` (modify)

**Dependencies:** None

---

### Step 7.3: Improve toast positioning for mobile

**Complexity:** S

**Acceptance criteria:**

- [ ] Toasts appear at the top-center on mobile (<768px) instead of top-right
- [ ] Toast width is constrained to `calc(100vw - 2rem)` on mobile (already done)
- [ ] Toasts don't overlap with the mobile bottom navigation bar
- [ ] Multiple toasts stack vertically without overlapping

**Sub-steps:**

a. Read `Toast.tsx` — find the `AnimatedToaster` component (renders `<Toaster>` from `react-hot-toast` with `position` prop)
b. Add `useIsMobile()` hook inside `AnimatedToaster` and conditionally pass `position="top-center"` on mobile vs `position="top-right"` on desktop
c. The `position` prop is set at render time and updates reactively when the hook value changes
d. Test with multiple simultaneous toasts at 375px

**Files:**

- `apps/web/src/components/ui/Toast.tsx` (modify)

**Dependencies:** Step 1.1

---

## Phase 8: Cross-Browser Testing & Final QA

### Step 8.1: Create responsive E2E test suite

**Complexity:** M

**Acceptance criteria:**

- [ ] Playwright tests exist that run at 3 viewport sizes: 375x812 (iPhone), 768x1024 (iPad), 1280x720 (desktop)
- [ ] Tests verify: no horizontal overflow, sidebar/nav visibility, grid column counts, touch target sizes
- [ ] Tests cover: Dashboard, Calendar, PostList, Analytics, Users, Settings pages
- [ ] Tests pass on all 3 viewports

**Sub-steps:**

a. Create `e2e/responsive.spec.ts` with viewport configuration for mobile, tablet, desktop
b. **Auth setup**: Reuse the existing `loginAsAdmin` helper pattern from `e2e/feedback.spec.ts` (lines 7–15) to authenticate before visiting protected routes. Admin role is required for the Users page specifically. **Important**: The login mutation navigates to `'/'` (not `/dashboard`), so the helper should wait for `page.waitForURL('**/')` instead of `**/dashboard` to avoid intermittent timeouts
c. Write tests that check:

- No element has `scrollWidth > clientWidth` (horizontal overflow detection)
- Sidebar is hidden on mobile, rail on tablet, full on desktop
- Bottom nav is visible on mobile, hidden on tablet+
- Grid columns match expected counts at each breakpoint
  d. Write page-specific tests for critical pages (Calendar view mode, PostList grid, Users table/card switch)
  e. Run tests and fix any failures

**Files:**

- `e2e/responsive.spec.ts` (create)

**Dependencies:** All previous steps

---

### Step 8.2: Manual cross-browser verification checklist

**Complexity:** S

**Acceptance criteria:**

- [ ] A testing checklist document exists in `memory-bank/` covering all pages at all breakpoints
- [ ] Checklist covers: Chrome Mobile, Safari iOS, Chrome Android, Firefox Mobile, Chrome Desktop, Safari Desktop
- [ ] Each page has pass/fail status for each browser/viewport combination

**Sub-steps:**

a. Create `memory-bank/testing/responsive-testing-checklist.md`
b. List all pages and the specific responsive behaviors to verify
c. Create a matrix: pages x viewports x browsers
d. Use this as a manual testing guide

**Files:**

- `memory-bank/testing/responsive-testing-checklist.md` (create)

**Dependencies:** All previous steps

---

## Risk Areas & Recommendations

| Component     | Issue                                                                       | Recommendation                                                                              |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| FullCalendar  | Third-party library controls mobile rendering; limited CSS override options | Test thoroughly, use FullCalendar's built-in responsive options before custom CSS overrides |
| Tiptap Editor | Rich text toolbar can overflow on narrow screens                            | Add `flex-wrap` to toolbar; consider a collapsible toolbar on mobile                        |
| Recharts      | Charts may have unreadable axis labels on phones                            | Reduce tick count with `minTickGap`, hide legend on mobile, use shorter labels              |
| Bottom Nav    | Adding fixed bottom nav affects all page scroll positions                   | Use `pb-16 md:pb-0` on main content, test all pages for overlap                             |
| Sidebar Rail  | Tablet sidebar rail is a new component; may have z-index conflicts          | Test with modals, dropdowns, and toasts for layering issues                                 |
| Safe Areas    | iPhone notch and home indicator affect bottom nav and FAB buttons           | Always use `safe-area-bottom` on fixed bottom elements; test on iOS simulator               |

### Breaking Changes

None expected — all changes are additive CSS/responsive improvements. No API changes, no data model changes.

### Testing Recommendations

- **Physical device testing**: Use BrowserStack or a real iPhone/iPad to verify touch interactions, safe areas, and keyboard behavior
- **Viewport simulation**: Chrome DevTools device toolbar for quick iteration, but always verify on real devices for final QA
- **Orientation**: Test both portrait and landscape on tablets — landscape may expose different overflow issues
- **Keyboard**: Test form pages (PostEditor, Settings) with virtual keyboard open — content should scroll to keep focused input visible
- **Long content**: Test with maximum-length titles, descriptions, and comments to verify truncation and wrapping

### Quick Wins

These can be done independently with minimal risk:

1. **Step 1.3**: Document breakpoint conventions (zero code change, prevents future inconsistency)
2. **Step 3.1**: TopPostsTable mobile cards (isolated component, high impact)
3. **Step 7.2**: Responsive typography (simple Tailwind class additions across pages)
4. **Step 6.1**: AmbassadorQueue card wrapping (one-line flex-direction change)
5. **Step 1.2**: PWA manifest (new files only, no existing code changes)

---

## Progress Tracking

### Phase 1: Foundation & Responsive Infrastructure

- [ ] Step 1.1: Create shared `useBreakpoint` hook and responsive utilities
- [ ] Step 1.2: Add PWA manifest and mobile meta tags
- [ ] Step 1.3: Document responsive breakpoint conventions

### Phase 2: Layout Shell & Navigation

- [ ] Step 2.1: Add tablet sidebar mode (collapsed icon-only rail)
- [ ] Step 2.2: Improve mobile header for small screens
- [ ] Step 2.3: Add mobile bottom navigation bar (mandatory)

### Phase 3: Core Pages — Tables & Data Views

- [ ] Step 3.1: Fix TopPostsTable responsive layout (Analytics)
- [ ] Step 3.2: Fix Users page table overflow on tablets
- [ ] Step 3.3: Fix Feedback page table overflow on tablets

### Phase 4: Content Creation — Editors & Forms

- [ ] Step 4.1: Optimize PostEditor for tablet layout
- [ ] Step 4.2: Optimize ArticleEditor for mobile and tablet

### Phase 5: Dashboard, Analytics & Charts

- [ ] Step 5.1: Optimize Dashboard grid for small phones
- [ ] Step 5.2: Optimize Analytics page for mobile

### Phase 6: Supporting Pages & Remaining Views

- [ ] Step 6.1: Optimize AmbassadorQueue cards for small screens
- [ ] Step 6.2: Verify and fix SocialAccounts page on mobile
- [ ] Step 6.3: Verify and fix Settings page on mobile
- [ ] Step 6.4: Optimize modals and dialogs for mobile

### Phase 7: Touch Interactions & Mobile UX Polish

- [ ] Step 7.1: Improve calendar touch interactions
- [ ] Step 7.2: Add responsive typography scaling
- [ ] Step 7.3: Improve toast positioning for mobile

### Phase 8: Cross-Browser Testing & Final QA

- [ ] Step 8.1: Create responsive E2E test suite
- [ ] Step 8.2: Manual cross-browser verification checklist
