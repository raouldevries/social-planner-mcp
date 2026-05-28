# Plan: Feedback Detail Modal with Reply Thread

> Enable full feedback viewing and reply conversations with email notifications to the original poster

| Field   | Value                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------- |
| Created | 2026-03-04                                                                                               |
| Status  | Planning                                                                                                 |
| Target  | Add detail modal to feedback page for full text viewing and reply functionality with email notifications |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Project Skills

| Skill              | Role                                             |
| ------------------ | ------------------------------------------------ |
| `/frontend-design` | UI component implementation for the detail modal |

### Audit References

| File                                        | Purpose                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| `CLAUDE.md`                                 | Project conventions, code patterns, API resource pattern |
| `packages/shared/src/validation/schemas.ts` | Zod schema conventions                                   |

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
│     - Use `/audit-loop` Phase 1 (test-first)               │
│     - Use `/frontend-design` for modal UI (Step 3.1)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against CLAUDE.md conventions        │
│     - Verify types match between shared/api/web             │
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
- [ ] `npm run build` passes
- [ ] `npm run test --filter=@social-planner/api` passes

---

## Context

### Current State

- Feedback page (`apps/web/src/pages/Feedback.tsx`) displays feedback in a table with CSS `line-clamp-2` truncation — long messages are cut off with no way to read the full text
- No reply/conversation feature exists on feedback items
- Feedback model stores: `id`, `userId`, `pageUrl`, `elementSelector`, `elementLabel`, `content`, `screenshotUrl`, `status`
- Status flow: `NEW → REVIEWED → RESOLVED`
- Existing modals on the page: screenshot preview (`Modal` size="full") and delete confirmation (`ConfirmModal`)

### Key Patterns Found

- **Modal component:** `apps/web/src/components/ui/Modal.tsx` — Framer Motion, sizes: sm/md/lg/xl/full, props: `isOpen`, `onClose`, `title`, `footer`
- **Comment system (reply pattern to follow):** `Comment` model has self-referencing `parentId`/`replies` relation. `CommentThread` renders recursively with `CommentInput` for reply textarea. Supports Cmd+Enter, auto-resize, cancel button.
- **Email notifications:** `apps/api/src/services/email.service.ts` — `sendEmail({ to, subject, html, text })`, returns boolean, non-throwing. Templates use 600px container, escaped user content, indigo CTA button.
- **Notification service:** `apps/api/src/services/notification.service.ts` — `createNotification(userId, type, data)` for single user, `notifyAdmins(type, data)` for admins. Template switch in `getNotificationTemplate()`.
- **Feedback service:** `apps/api/src/services/feedback.service.ts` — `feedbackSelect` object for Prisma queries, `formatFeedback()` for API response mapping, `escapeHtml()` for email safety.
- **TanStack Query pattern:** `feedbackKeys` with `all`, `lists()`, `list(filters)`. Mutations invalidate `feedbackKeys.all`. Stale time: 2 min.
- **Route pattern:** `requireAuth` middleware, `validate(schema)` for Zod, try/catch with `next(error)`.

### Critical Gaps

- No `FeedbackReply` model — needs new Prisma model + migration
- No `FEEDBACK_REPLY` notification type — needs addition to enum
- No reply API endpoints — needs routes + service functions
- No detail modal component — needs new component
- No email function for reply notifications — needs `sendFeedbackReplyEmail()`

---

## Phase 1: Backend — Data Model & API

### Step 1.1: Add FeedbackReply model and migration

**Complexity:** S

**Acceptance criteria:**

- [ ] `FeedbackReply` model exists in Prisma schema with fields: `id`, `feedbackId`, `authorId`, `content`, `createdAt`, `updatedAt`
- [ ] `Feedback` model has `replies FeedbackReply[]` relation
- [ ] `FEEDBACK_REPLY` added to `NotificationType` enum
- [ ] Migration runs successfully (`npm run db:migrate`)
- [ ] `npm run build` passes

**Sub-steps:**

a. Add `FeedbackReply` model to `packages/database/prisma/schema.prisma` following `Comment` model pattern — with `feedbackId` FK, `authorId` FK, `content` String, timestamps, cascade delete on feedback, indexes on `feedbackId` and `authorId`, map to `feedback_replies` table
b. Add `replies FeedbackReply[]` to existing `Feedback` model
c. Add `FEEDBACK_REPLY` to the `NotificationType` enum
d. Run `npm run db:migrate` to create migration

**Files:**

- `packages/database/prisma/schema.prisma`

**Dependencies:** None

---

### Step 1.2: Add shared types and validation schemas

**Complexity:** S

**Acceptance criteria:**

- [ ] `FeedbackReply` interface defined in shared types
- [ ] `CreateFeedbackReplyRequest` type defined
- [ ] `FeedbackSummary` updated with optional `replyCount` field
- [ ] `createFeedbackReplySchema` Zod schema validates content (min 1, max 5000)
- [ ] `npm run build` passes

**Sub-steps:**

a. Add `FeedbackReply` interface to `packages/shared/src/types/api.ts` with fields: `id`, `feedbackId`, `authorId`, `authorName`, `content`, `createdAt`
b. Add `CreateFeedbackReplyRequest` type: `{ content: string }`
c. Add `replyCount?: number` to existing `FeedbackSummary` interface
d. Add `createFeedbackReplySchema` to `packages/shared/src/validation/schemas.ts` following `updateFeedbackContentSchema` pattern

**Files:**

- `packages/shared/src/types/api.ts`
- `packages/shared/src/validation/schemas.ts`

**Dependencies:** Step 1.1

---

### Step 1.3: Add feedback reply service functions and email notification

**Complexity:** M

**Acceptance criteria:**

- [ ] `getFeedbackReplies(feedbackId)` returns replies with author name, ordered by `createdAt` asc
- [ ] `createFeedbackReply(feedbackId, authorId, content)` creates reply, sends in-app notification to feedback author, sends email to feedback author
- [ ] `deleteFeedbackReply(replyId, userId)` allows author or admin to delete
- [ ] `getFeedbacks()` includes `replyCount` in response (via `_count.replies`)
- [ ] `FEEDBACK_REPLY` notification template added to notification service
- [ ] Email to feedback author contains replier name, feedback context, and reply content (HTML-escaped)
- [ ] Reply author does NOT receive notification about their own reply
- [ ] API tests pass

**Sub-steps:**

a. Add `feedbackReplySelect` and `formatFeedbackReply()` in `apps/api/src/services/feedback.service.ts` following existing `feedbackSelect`/`formatFeedback` pattern
b. Add `getFeedbackReplies(feedbackId)` — query with author select, ordered asc
c. Add `createFeedbackReply(feedbackId, authorId, content)` — verify feedback exists, create reply, notify feedback owner (in-app via `createNotification` + email via new `sendFeedbackReplyEmail`)
d. Add `deleteFeedbackReply(replyId, userId)` — check ownership or admin role
e. Update `getFeedbacks()` query to include `_count: { select: { replies: true } }` and map to `replyCount` in `formatFeedback()`
f. Add `sendFeedbackReplyEmail(feedbackAuthorEmail, feedbackAuthorName, replierName, feedbackContent, replyContent)` following existing email template pattern with `escapeHtml()`
g. Add `FEEDBACK_REPLY` case to `getNotificationTemplate()` in `apps/api/src/services/notification.service.ts`

**Files:**

- `apps/api/src/services/feedback.service.ts`
- `apps/api/src/services/notification.service.ts`

**Dependencies:** Steps 1.1, 1.2

---

### Step 1.4: Add feedback reply API routes

**Complexity:** S

**Acceptance criteria:**

- [ ] `GET /api/feedback/:id/replies` returns replies for a feedback item (requires auth)
- [ ] `POST /api/feedback/:id/replies` creates a reply (requires auth, validates with Zod schema)
- [ ] `DELETE /api/feedback/replies/:replyId` deletes a reply (requires auth, author or admin)
- [ ] Routes registered in feedback router
- [ ] `npm run build` passes

**Sub-steps:**

a. Add `GET /:id/replies` route handler in `apps/api/src/routes/feedback.ts` — call `feedbackService.getFeedbackReplies()`
b. Add `POST /:id/replies` route with `requireAuth` + `validate(createFeedbackReplySchema)` — call `feedbackService.createFeedbackReply()`
c. Add `DELETE /replies/:replyId` route with `requireAuth` — call `feedbackService.deleteFeedbackReply()`

**Files:**

- `apps/api/src/routes/feedback.ts`

**Dependencies:** Step 1.3

---

## Phase 2: Frontend — Hooks & Detail Modal

### Step 2.1: Add frontend hooks for feedback replies

**Complexity:** S

**Acceptance criteria:**

- [ ] `useFeedbackReplies(feedbackId)` query hook fetches replies (enabled only when feedbackId is truthy)
- [ ] `useCreateFeedbackReply()` mutation creates reply and invalidates reply list + feedback list (for count update)
- [ ] `useDeleteFeedbackReply()` mutation deletes reply and invalidates reply list + feedback list
- [ ] Query keys follow existing pattern: `feedbackKeys.replies(id)`
- [ ] `npm run build` passes

**Sub-steps:**

a. Add `replies: (id: string) => [...feedbackKeys.all, 'replies', id] as const` to `feedbackKeys` in `apps/web/src/hooks/useFeedback.ts`
b. Add `useFeedbackReplies(feedbackId: string | null)` query hook — `GET /feedback/${feedbackId}/replies`, stale time 30s, enabled when feedbackId is truthy
c. Add `useCreateFeedbackReply()` mutation — `POST /feedback/${feedbackId}/replies`, invalidates `feedbackKeys.replies(feedbackId)` + `feedbackKeys.lists()`, success toast
d. Add `useDeleteFeedbackReply()` mutation — `DELETE /feedback/replies/${replyId}`, same invalidation

**Files:**

- `apps/web/src/hooks/useFeedback.ts`

**Dependencies:** Step 1.4

---

### Step 2.2: Create FeedbackDetailModal component

**Complexity:** M

**Acceptance criteria:**

- [ ] Modal opens with full feedback content (no truncation)
- [ ] Shows metadata: user name, page URL, element label, submitted date, status badge
- [ ] Shows screenshot thumbnail (clickable to enlarge) if present
- [ ] Shows reply thread: list of replies with author name, timestamp, content
- [ ] Reply input with textarea, Cmd+Enter submit, cancel button
- [ ] Admin can change status via dropdown in modal
- [ ] Delete reply button visible for reply author and admins
- [ ] Empty state when no replies ("No replies yet")
- [ ] Loading state while fetching replies

**Sub-steps:**

a. Create `apps/web/src/components/feedback/FeedbackDetailModal.tsx` using existing `Modal` component (`size="lg"`)
b. Layout: header with user + date + status badge, body with full content text, screenshot section, divider, reply thread section
c. Reply thread: map over replies from `useFeedbackReplies()`, each showing author name, relative timestamp, content, delete button (hover)
d. Reply input at bottom: textarea (auto-resize, max 5000 chars), Submit button, Cmd+Enter shortcut — following `CommentInput` UX pattern but simplified (no @ mentions needed)
e. Status dropdown for admins using existing `useUpdateFeedback()` hook
f. Wire up `useCreateFeedbackReply()` and `useDeleteFeedbackReply()` mutations

**Files:**

- `apps/web/src/components/feedback/FeedbackDetailModal.tsx` (new)

**Dependencies:** Step 2.1

---

### Step 2.3: Update Feedback page to use detail modal

**Complexity:** S

**Acceptance criteria:**

- [ ] Clicking a feedback row (table or card) opens the detail modal
- [ ] Reply count badge visible next to feedback text in list view
- [ ] Feedback status auto-updates to REVIEWED when admin opens a NEW feedback item
- [ ] Existing screenshot preview and delete confirmation modals still work
- [ ] Click on action buttons (edit, delete, status) does NOT also open the detail modal (event propagation handled)

**Sub-steps:**

a. Add `selectedFeedback` state to `apps/web/src/pages/Feedback.tsx`
b. Make table rows and mobile cards clickable — add `onClick` handler, `cursor-pointer` class
c. Stop propagation on existing action buttons (status select, edit, delete) to prevent modal opening
d. Show reply count badge next to feedback content text (e.g., `💬 3` or speech bubble icon + count)
e. Render `FeedbackDetailModal` with `isOpen={!!selectedFeedback}` and `onClose={() => setSelectedFeedback(null)}`
f. Auto-mark NEW feedback as REVIEWED when opening modal (call `useUpdateFeedback` if status is NEW and user is admin)

**Files:**

- `apps/web/src/pages/Feedback.tsx`

**Dependencies:** Step 2.2

---

## Risk Areas & Recommendations

| Component         | Issue                                              | Recommendation                                                                                 |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Email delivery    | Email may fail silently                            | Use fire-and-forget pattern (`.catch()`) like existing feedback emails — email is non-critical |
| Event propagation | Clicking action buttons may also trigger row click | Use `e.stopPropagation()` on all interactive elements in table rows                            |
| Reply count sync  | Count may be stale after adding reply              | Invalidate `feedbackKeys.lists()` on reply create/delete to refresh counts                     |

### Breaking Changes

None expected. The `replyCount` field is added as optional to `FeedbackSummary`, and all new functionality is additive.

### Testing Recommendations

- API: Test reply CRUD operations, notification sending, email trigger, permission checks (author vs admin vs other user)
- Frontend: Manual test the full flow — open modal, read full text, add reply, verify reply appears, verify email sent (check MailHog), verify reply count updates in list

### Quick Wins

- Step 1.1 (schema + migration) and Step 1.2 (types) are small and can be done first to unblock everything else

---

## Progress Tracking

### Phase 1: Backend — Data Model & API

- [ ] Step 1.1: Add FeedbackReply model and migration
- [ ] Step 1.2: Add shared types and validation schemas
- [ ] Step 1.3: Add feedback reply service functions and email notification
- [ ] Step 1.4: Add feedback reply API routes

### Phase 2: Frontend — Hooks & Detail Modal

- [ ] Step 2.1: Add frontend hooks for feedback replies
- [ ] Step 2.2: Create FeedbackDetailModal component
- [ ] Step 2.3: Update Feedback page to use detail modal
