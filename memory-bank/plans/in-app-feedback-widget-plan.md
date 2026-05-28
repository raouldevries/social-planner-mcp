# Plan: In-App Feedback Widget

> Annotation-style feedback system: click a page section, leave feedback with auto-captured context and screenshot.

| Field     | Value                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Created   | 2026-03-03                                                                                                                                                                |
| Status    | Planning                                                                                                                                                                  |
| Target    | Add a temporary in-app feedback feature where users click on a specific page section and leave feedback, with auto-captured URL, element context, and optional screenshot |
| Temporary | Yes — designed with a feature flag for easy removal                                                                                                                       |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Project Skills

| Skill              | Role                                                           |
| ------------------ | -------------------------------------------------------------- |
| `/frontend-design` | UI component implementation for feedback widget and admin page |
| `/webapp-testing`  | Browser-level verification of feedback mode interaction        |

### Audit References

| File                                        | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `CLAUDE.md`                                 | Project architecture, code patterns, and conventions |
| `apps/api/src/services/CLAUDE.md`           | API service patterns                                 |
| `packages/shared/src/validation/schemas.ts` | Zod validation patterns                              |

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
│     - Use `/frontend-design` for component creation         │
│     - Use `/audit-loop` Phase 1 (test-first)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against CLAUDE.md conventions        │
│     - `/webapp-testing` for browser verification            │
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
- [ ] Browser-tested on local dev server (`/webapp-testing`)

---

## Context

### Current State

- **Monorepo** with `apps/api` (Express), `apps/web` (React + Vite), `packages/database` (Prisma), `packages/shared` (types + validation)
- **UI components** in `apps/web/src/components/ui/` — Modal, Button, Textarea, FormField, Alert, Toast all available
- **Layout** in `apps/web/src/components/Layout.tsx` — sidebar (left) + header (top) + main content area with `<Outlet />`
- **Auth** via Zustand store (`useUser()`, `useIsAdmin()`) and JWT middleware on API
- **Forms** use react-hook-form + Zod validation
- **Queries/mutations** use TanStack Query with standardized key patterns
- **Animations** via Motion (framer-motion) with pre-built variants in `apps/web/src/lib/animations.ts`
- **Notifications** — in-app (database) via `notification.service.ts` + email via `email.service.ts` (MailHog dev, Resend prod)

### Key Patterns Found

- **Route pattern**: `apps/api/src/routes/comments.ts` — middleware stack: `requireAuth → validate(schema) → writeRateLimiter → handler`
- **Service pattern**: `apps/api/src/services/comment.service.ts` — Prisma queries with `select`, throw `AppError` on failure
- **Hook pattern**: `apps/web/src/hooks/usePost.ts` — query keys object, `useQuery`/`useMutation`, toast on success/error
- **Type pattern**: `packages/shared/src/types/api.ts` — interfaces for request/response types
- **Schema pattern**: `packages/shared/src/validation/schemas.ts` — Zod schemas shared between frontend and API
- **Modal pattern**: z-50, frosted backdrop, Motion animations, size variants
- **Z-index stack**: z-10 (headers) → z-30 (mobile backdrop) → z-40 (sidebar/floating) → z-50 (modals)

### Critical Gaps

- No `Feedback` model in Prisma schema — needs to be created
- No screenshot capture utility — need `html2canvas` library
- No "feedback mode" overlay pattern exists — new interaction paradigm for this app
- No `NotificationType.FEEDBACK_SUBMITTED` enum value — needs adding in TWO places: `schema.prisma` enum AND `packages/shared/src/constants/status.ts` NOTIFICATION_TYPE object, plus a case in `getNotificationTemplate()` in `notification.service.ts`
- Feature flag system doesn't exist — need a simple toggle mechanism
- No `ReactDOM.createPortal` usage in codebase — Modal uses fixed positioning directly, popover will follow same pattern
- No `apps/web/.env.example` file exists — VITE\_\* env vars need a dedicated file

---

## Phase 1: Database & API Foundation

### Step 1.1: Add Feedback model to Prisma schema

**Complexity:** S

**Acceptance criteria:**

- [ ] `Feedback` model exists in schema with fields: id, userId, pageUrl, elementSelector, elementLabel, content, screenshotUrl, status, createdAt, updatedAt
- [ ] `FeedbackStatus` enum exists with values: `NEW`, `REVIEWED`, `RESOLVED`
- [ ] `FEEDBACK_SUBMITTED` added to `NotificationType` enum in `schema.prisma`
- [ ] `FEEDBACK_SUBMITTED` added to `NOTIFICATION_TYPE` object in `packages/shared/src/constants/status.ts`
- [ ] `FEEDBACK_SUBMITTED` case added to `getNotificationTemplate()` in `apps/api/src/services/notification.service.ts`
- [ ] Migration runs successfully with `npm run db:migrate`
- [ ] Relations: Feedback → User (onDelete: Cascade)

**Sub-steps:**

a. Add `FeedbackStatus` enum to `schema.prisma`
b. Add `Feedback` model with all fields, relations, and indexes (include `elementLabel` field for the human-readable `data-feedback-label` value)
c. Add `FEEDBACK_SUBMITTED` to the `NotificationType` enum in `schema.prisma`
d. Add `FEEDBACK_SUBMITTED: 'FEEDBACK_SUBMITTED'` to the `NOTIFICATION_TYPE` object in `packages/shared/src/constants/status.ts`
e. Add a `FEEDBACK_SUBMITTED` case to `getNotificationTemplate()` in `apps/api/src/services/notification.service.ts` (title: "New feedback submitted", body template with user name and page URL)
f. Update the hardcoded `z.enum([...])` notification type filter in `apps/api/src/routes/notifications.ts` to include `FEEDBACK_SUBMITTED` (or refactor to derive from the shared constants)
g. Run `npm run db:migrate` to create and apply migration (batches both Feedback model and NotificationType enum change)
h. Verify with `npm run db:studio`

**Files:**

- `packages/database/prisma/schema.prisma`
- `packages/shared/src/constants/status.ts`
- `apps/api/src/services/notification.service.ts`
- `apps/api/src/routes/notifications.ts` (hardcoded notification type enum)

**Dependencies:** None

---

### Step 1.2: Add shared types and validation schemas

**Complexity:** S

**Acceptance criteria:**

- [ ] `FeedbackSummary` and `CreateFeedbackRequest` types exist in `api.ts`
- [ ] `createFeedbackSchema` Zod schema validates: content (1-5000 chars, required), pageUrl (string, required), elementSelector (string, optional), elementLabel (string, optional), screenshotUrl (string URL, optional). Note: the validate middleware (`validate.ts:15`) replaces `req.body` with parsed output, so ALL fields that the service needs must be in the schema or they will be silently dropped
- [ ] Types are exported from the shared package barrel

**Sub-steps:**

a. Add `FeedbackSummary`, `CreateFeedbackRequest`, and `FeedbackStatus` types to `packages/shared/src/types/api.ts`. `CreateFeedbackRequest` must include: `content`, `pageUrl`, `elementSelector?`, `elementLabel?`, `screenshotUrl?`
b. Add `createFeedbackSchema` and `updateFeedbackSchema` to `packages/shared/src/validation/schemas.ts`
c. Export new types from barrel files

**Files:**

- `packages/shared/src/types/api.ts`
- `packages/shared/src/validation/schemas.ts`

**Dependencies:** Step 1.1

---

### Step 1.3: Create feedback API service and routes

**Complexity:** M

**Acceptance criteria:**

- [ ] `POST /api/feedback` creates feedback (any authenticated user), returns 201
- [ ] `GET /api/feedback` lists all feedback (admin only), supports pagination and status filter
- [ ] `PATCH /api/feedback/:id` updates feedback status (admin only)
- [ ] `DELETE /api/feedback/:id` deletes feedback (admin only)
- [ ] Submitting feedback creates an in-app notification for all admins
- [ ] Submitting feedback sends an email notification to admins
- [ ] Rate limited: max 10 feedback submissions per user per hour (custom rate limiter, NOT writeRateLimiter which is 300/min)

**Sub-steps:**

a. Create `apps/api/src/services/feedback.service.ts` following comment.service.ts pattern
b. Implement `createFeedback()` — save to DB, notify admins (in-app + email)
c. Implement `getFeedbacks()` with pagination, status filter, and include user info
d. Implement `updateFeedbackStatus()` and `deleteFeedback()` (admin only)
e. Create `apps/api/src/routes/feedback.ts` with all endpoints and middleware. Create a custom `feedbackRateLimiter` using `rateLimiter({ windowMs: 60 * 60 * 1000, max: 10, keyGenerator: (req) => \`ratelimit:feedback:${req.user?.id}\` })`from`apps/api/src/middleware/rateLimiter.ts`and apply it only to the POST /api/feedback route
f. Export`feedbackRoutes`from`apps/api/src/routes/index.ts`. Register route inside the `registerRemainingRoutes()`function in`apps/api/src/app.ts`using`app.use('/api/feedback', feedbackRoutes)`, placed alongside the other authenticated routes (NOT at the top level)

**Files:**

- `apps/api/src/services/feedback.service.ts`
- `apps/api/src/routes/feedback.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/app.ts` (inside `registerRemainingRoutes()`)

**Dependencies:** Steps 1.1, 1.2

---

### Step 1.4: Add screenshot upload endpoint

**Complexity:** S

**Acceptance criteria:**

- [ ] `POST /api/feedback/upload-screenshot` accepts a JSON body `{ imageBase64: string }` (raw base64-encoded PNG/JPEG), stores it in S3/MinIO, returns `{ url: string }`
- [ ] Image is stored under `feedback-screenshots/` prefix with UUID filename
- [ ] Max decoded file size: 5MB (validated after `Buffer.from(imageBase64, 'base64')`)
- [ ] Only accepts PNG/JPEG (validated by checking magic bytes of decoded buffer)
- [ ] Express JSON body limit of 10MB (configured in app.ts) accommodates 5MB images (~6.67MB as base64)

**Sub-steps:**

a. Add screenshot upload function to `feedback.service.ts`: decode base64 string to Buffer, validate size (≤5MB decoded) and type (PNG/JPEG magic bytes), upload to S3 using `uploadFile(key, buffer, { contentType })` from `apps/api/src/lib/s3.ts`
b. Add upload route to `apps/api/src/routes/feedback.ts` — accepts JSON body (NOT multipart), uses `requireAuth` middleware
c. Return `{ url: string }` with the S3/MinIO object URL

**Files:**

- `apps/api/src/services/feedback.service.ts`
- `apps/api/src/routes/feedback.ts`

**Dependencies:** Step 1.3

---

## Phase 2: Frontend Feedback Widget

### Step 2.1: Create TanStack Query hooks for feedback

**Complexity:** S

**Acceptance criteria:**

- [ ] `useFeedbacks(filters)` query hook fetches paginated feedback list
- [ ] `useCreateFeedback()` mutation submits feedback and shows success toast
- [ ] `useUpdateFeedback()` mutation updates status (admin)
- [ ] `useDeleteFeedback()` mutation deletes feedback (admin)
- [ ] `useUploadScreenshot()` mutation uploads base64 screenshot and returns URL
- [ ] All mutations invalidate feedback queries on success

**Sub-steps:**

a. Create `apps/web/src/hooks/useFeedback.ts` following usePost.ts pattern
b. Define `feedbackKeys` object with standard key hierarchy
c. Implement all query and mutation hooks with toast notifications

**Files:**

- `apps/web/src/hooks/useFeedback.ts`

**Dependencies:** Step 1.3, 1.4

---

### Step 2.2: Build the feedback mode overlay system

**Complexity:** L

This is the core interaction — entering "feedback mode" where sections highlight on hover and clicking opens a feedback form.

**Acceptance criteria:**

- [ ] `FeedbackModeProvider` context provides `isFeedbackMode`, `enterFeedbackMode()`, `exitFeedbackMode()`
- [ ] In feedback mode: cursor changes to crosshair, page sections highlight on hover with a semi-transparent overlay
- [ ] Hoverable sections are semantic blocks: `<section>`, `<article>`, `<div>` with specific data attributes, or components with `[data-feedback-target]`
- [ ] Clicking a section captures the selected element info in context state (`selectedElement`, `elementSelector`, `elementLabel`, `elementRect`) and exits feedback mode. The popover opening is handled in Step 2.3
- [ ] Pressing Escape exits feedback mode without action. The Escape handler must first check that no modal is active (via `document.querySelector('[aria-modal="true"]')` — Modal.tsx sets `aria-modal="true"`). Since Modal registers its own `document.addEventListener('keydown')`, using `stopPropagation()` alone is insufficient — instead, the feedback overlay's Escape handler should be a no-op when `aria-modal="true"` is detected (state-based ownership), avoiding the need to suppress another same-target listener
- [ ] When the feedback popover is open (Step 2.3), Escape is handled by the popover only (closes popover, re-enters feedback mode) — not by the overlay
- [ ] A banner at the top of the page indicates feedback mode is active ("Click on a section to leave feedback")
- [ ] Feedback mode is automatically disabled when any Modal is open (detect via `document.querySelector('[aria-modal="true"]')`, NOT by z-index class since dropdowns and other non-modal elements also use z-50)

**Sub-steps:**

a. Create `apps/web/src/components/feedback/FeedbackModeContext.tsx` — React context with state and methods
b. Create `apps/web/src/components/feedback/FeedbackModeOverlay.tsx` — the hover highlight logic using mouse events and element detection
c. Implement section detection: on mousemove, find the nearest meaningful container element and highlight it with a colored border/overlay
d. On click, capture the element's CSS selector path and bounding rect
e. Show a feedback mode banner at the top of the viewport

**Files:**

- `apps/web/src/components/feedback/FeedbackModeContext.tsx`
- `apps/web/src/components/feedback/FeedbackModeOverlay.tsx`
- `apps/web/src/components/feedback/FeedbackModeBanner.tsx`

**Dependencies:** None (parallel with Phase 1)

---

### Step 2.3: Build the feedback submission popover

**Complexity:** M

**Acceptance criteria:**

- [ ] Popover appears near the clicked element using fixed positioning (same approach as the existing Modal component — no Portal needed, the codebase does not use `ReactDOM.createPortal`). Respects viewport bounds
- [ ] Contains: text area (required), "Capture screenshot" toggle, submit/cancel buttons
- [ ] Screenshot capture uses `html2canvas` on the selected element
- [ ] On submit: uploads screenshot (if captured), then creates feedback with all context
- [ ] Shows loading state during submission
- [ ] On success: shows toast, closes popover, exits feedback mode
- [ ] On cancel: closes popover, re-enters feedback mode (user can pick another section)

**Sub-steps:**

a. Install `html2canvas` package: `npm install html2canvas --workspace=apps/web`
b. Create `apps/web/src/components/feedback/FeedbackPopover.tsx` — positioned popover with form
c. Implement screenshot capture: use `html2canvas` to render the selected element to canvas, convert to base64
d. Wire up `useCreateFeedback()` and `useUploadScreenshot()` mutations
e. Add smart positioning logic (flip if near viewport edges)

**Files:**

- `apps/web/src/components/feedback/FeedbackPopover.tsx`
- `apps/web/package.json` (html2canvas dependency)

**Dependencies:** Steps 2.1, 2.2

---

### Step 2.4: Add floating feedback button and integrate into Layout

**Complexity:** S

**Acceptance criteria:**

- [ ] Floating circular button appears in bottom-right corner on all authenticated pages
- [ ] Button uses a speech-bubble or annotation icon
- [ ] Clicking the button enters feedback mode
- [ ] Button is hidden while feedback mode is active
- [ ] Button respects z-index stack (z-40, below modals). On mobile, hide the button when the sidebar is open (sidebar also uses z-40 on mobile)
- [ ] Feature flag: button only renders when `VITE_FEEDBACK_ENABLED=true`
- [ ] `VITE_FEEDBACK_ENABLED` declared in `ImportMetaEnv` interface in `apps/web/src/vite-env.d.ts`
- [ ] Smooth entrance animation (scale + fade)

**Sub-steps:**

a. Create `apps/web/src/components/feedback/FeedbackButton.tsx` — floating button with Motion animation
b. Wrap `<Layout />` with `<FeedbackModeProvider>` in `apps/web/src/components/Layout.tsx`
c. Add `<FeedbackButton />`, `<FeedbackModeOverlay />`, `<FeedbackModeBanner />`, and `<FeedbackPopover />` inside the Layout
d. Add `VITE_FEEDBACK_ENABLED` env var check: `import.meta.env.VITE_FEEDBACK_ENABLED === 'true'`
e. Add `readonly VITE_FEEDBACK_ENABLED?: string` to the `ImportMetaEnv` interface in `apps/web/src/vite-env.d.ts` (currently only declares `VITE_API_URL`)
f. Create `apps/web/.env.example` (if it doesn't exist) and add `VITE_FEEDBACK_ENABLED=false`. Also add `VITE_FEEDBACK_ENABLED=true` to `apps/web/.env` (gitignored local env) for development

**Files:**

- `apps/web/src/components/feedback/FeedbackButton.tsx`
- `apps/web/src/components/feedback/index.ts` (barrel export)
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/vite-env.d.ts` (add VITE_FEEDBACK_ENABLED to ImportMetaEnv)
- `apps/web/.env.example` (new)
- `apps/web/.env` (local dev only)

**Dependencies:** Steps 2.2, 2.3

---

## Phase 3: Admin Feedback Dashboard

### Step 3.1: Build admin feedback list page

**Complexity:** M

**Acceptance criteria:**

- [ ] New page at `/feedback` accessible only to admins
- [ ] Displays feedback in a table/card list: user name, page URL, content preview, status badge, date
- [ ] Filter by status (All, New, Reviewed, Resolved)
- [ ] Clicking a feedback item expands to show full content, screenshot (if any), and element selector
- [ ] Admin can change status (New → Reviewed → Resolved) via dropdown or buttons
- [ ] Admin can delete feedback with confirmation

**Sub-steps:**

a. Create `apps/web/src/pages/Feedback.tsx` — admin feedback dashboard page
b. Export `Feedback` from `apps/web/src/pages/index.tsx` barrel (all pages are imported via this barrel in router.tsx)
c. Add route to `apps/web/src/router.tsx` under protected routes with `requiredRole={['ADMIN']}`, importing `Feedback` from `'@/pages'`
d. Build feedback list with status filter tabs
e. Build expandable feedback detail view with screenshot display
f. Wire up status update and delete mutations
g. Add "Feedback" link to sidebar navigation in Layout (admin only)

**Files:**

- `apps/web/src/pages/Feedback.tsx`
- `apps/web/src/pages/index.tsx` (barrel export)
- `apps/web/src/router.tsx`
- `apps/web/src/components/Layout.tsx` (sidebar nav)

**Dependencies:** Step 2.1

---

## Phase 4: Polish & Testing

### Step 4.1: Add data-feedback-target attributes to key pages

**Complexity:** S

**Acceptance criteria:**

- [ ] Calendar page has `data-feedback-target` on main calendar area, sidebar, and header
- [ ] Post editor has targets on: editor area, channel selector, media upload, preview panels
- [ ] Social accounts page has targets on: account cards, connect button area
- [ ] Settings pages have targets on form sections
- [ ] Each target has a human-readable `data-feedback-label` (e.g., "Calendar view", "Post editor")

**Sub-steps:**

a. Add `data-feedback-target` and `data-feedback-label` attributes to key sections across pages
b. Update feedback overlay to prefer `data-feedback-label` for display and storage

**Files:**

- `apps/web/src/pages/Calendar.tsx`
- `apps/web/src/pages/PostEditor.tsx`
- `apps/web/src/pages/SocialAccounts.tsx`
- `apps/web/src/components/settings/*.tsx`
- `apps/web/src/components/feedback/FeedbackModeOverlay.tsx`

**Dependencies:** Step 2.4

---

### Step 4.2: End-to-end testing on local dev server

**Complexity:** M

**Acceptance criteria:**

- [ ] Can enter feedback mode, hover highlights sections, click to open popover
- [ ] Can submit feedback with text only
- [ ] Can submit feedback with screenshot
- [ ] Feedback appears in admin dashboard with correct page URL and element info
- [ ] Admin can change status and delete feedback
- [ ] Email notification sent (visible in MailHog at localhost:8025)
- [ ] Feature flag toggle works (widget hidden when disabled)
- [ ] No visual regressions on existing pages
- [ ] Escape key exits feedback mode
- [ ] Mobile responsive: button and popover work on small screens

**Sub-steps:**

a. Test full feedback flow as a regular user (EDITOR role)
b. Test admin dashboard with filtering and status management
c. Verify email in MailHog
d. Test feature flag by toggling env var
e. Test on mobile viewport sizes
f. Test edge cases: very long feedback text, rapid clicks, navigation during feedback mode

**Files:** (test only, no code changes)

**Dependencies:** Steps 4.1, 3.1

---

## Risk Areas & Recommendations

| Component                  | Issue                                                | Recommendation                                                                                                                   |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| html2canvas                | Can be slow on complex DOM, doesn't capture all CSS  | Test on heaviest pages (Calendar with events). Consider capturing viewport screenshot instead of element-only if quality is poor |
| Feedback mode overlay      | May interfere with existing click handlers or modals | Disable feedback mode when a modal is open. Use event capturing phase carefully                                                  |
| Element selector stability | CSS selectors can break when UI changes              | Store `data-feedback-label` as primary identifier, CSS selector as fallback                                                      |
| Screenshot storage         | Screenshots can be large, storage costs              | Apply JPEG compression (quality 0.7), max 1920px width. Clean up old screenshots periodically                                    |
| Temporary feature removal  | Need clean removal path                              | All feedback code in `apps/web/src/components/feedback/`, feature flag gates everything, DB model can stay dormant               |

### Breaking Changes

None expected — this is a purely additive feature behind a feature flag.

### Testing Recommendations

- Test feedback mode with existing modals open (should be disabled or handled gracefully)
- Test on pages with complex layouts (Calendar with many events)
- Verify html2canvas output quality on different browsers
- Test rapid enter/exit of feedback mode
- Ensure feedback overlay doesn't break keyboard navigation

### Quick Wins

- Steps 1.1 and 1.2 (schema + types) are fast and unblock everything
- Step 2.2 (feedback mode overlay) can be developed in parallel with Phase 1

---

## Progress Tracking

### Phase 1: Database & API Foundation

- [x] Step 1.1: Add Feedback model to Prisma schema (2026-03-03, commit 589053a)
- [x] Step 1.2: Add shared types and validation schemas (2026-03-03, commit 881ba21)
- [x] Step 1.3: Create feedback API service and routes (2026-03-03, commit 693dceb)
- [x] Step 1.4: Add screenshot upload endpoint (2026-03-03, commit 9ea02c5)

### Phase 2: Frontend Feedback Widget

- [x] Step 2.1: Create TanStack Query hooks for feedback (2026-03-03, commit a16f9e4)
- [x] Step 2.2: Build the feedback mode overlay system (2026-03-03, commit 5598c75)
- [x] Step 2.3: Build the feedback submission popover (2026-03-03, commit af9a9ff)
- [ ] Step 2.4: Add floating feedback button and integrate into Layout

### Phase 3: Admin Feedback Dashboard

- [ ] Step 3.1: Build admin feedback list page

### Phase 4: Polish & Testing

- [ ] Step 4.1: Add data-feedback-target attributes to key pages
- [ ] Step 4.2: End-to-end testing on local dev server
