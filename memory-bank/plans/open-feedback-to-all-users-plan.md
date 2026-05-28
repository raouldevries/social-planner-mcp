# Plan: Open Feedback to All Users

> Make the feedback page visible to all users, allow editing own feedback, keep admin features admin-only.

| Field   | Value                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| Created | 2026-03-03                                                                                                          |
| Status  | Planning                                                                                                            |
| Target  | All users can view everyone's feedback and edit their own submissions; admins retain status management and deletion |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Project Skills

| Skill             | Role                                        |
| ----------------- | ------------------------------------------- |
| `/webapp-testing` | Browser-level verification of role-based UI |

### Audit References

| File                                        | Purpose                                                        |
| ------------------------------------------- | -------------------------------------------------------------- |
| `CLAUDE.md`                                 | Project architecture, code patterns, conventions               |
| `packages/shared/src/validation/schemas.ts` | Zod validation patterns                                        |
| `apps/api/src/services/feedback.service.ts` | API service patterns (AppError, Prisma select, formatFeedback) |

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
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against CLAUDE.md conventions        │
│     - `/webapp-testing` for role-based UI verification      │
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

---

## Context

### Current State

The feedback widget (Phases 1–4) is feature-complete and committed. Users can submit feedback via a floating button, but:

- The feedback page (`/feedback`) is admin-only (`ProtectedRoute requiredRole="ADMIN"`)
- The `GET /api/feedback` endpoint requires `requireAdmin` middleware
- `PATCH /api/feedback/:id` only updates `status` (admin-only)
- Users submit feedback into a black hole — no visibility into what others reported

### Key Patterns Found

| Pattern             | Location                    | Details                                                                     |
| ------------------- | --------------------------- | --------------------------------------------------------------------------- |
| Auth selectors      | `authStore.ts:65-69`        | `useUser()` returns user with `.id` and `.role`; `useIsAdmin()` checks role |
| Nav filtering       | `Layout.tsx:293-297`        | `requiresAdmin` prop on NavItem filters sidebar items                       |
| AppError            | `feedback.service.ts:9`     | `throw new AppError(code, message, statusCode)`                             |
| Feedback select     | `feedback.service.ts:30-46` | `feedbackSelect` object with user relation                                  |
| formatFeedback      | `feedback.service.ts:48-74` | Transforms DB → `FeedbackSummary`                                           |
| TanStack keys       | `useFeedback.ts:18-22`      | `feedbackKeys.all`, `.lists()`, `.list(filters)`                            |
| Mutation toast      | `useFeedback.ts:87`         | `toast.success('Feedback updated')` pattern                                 |
| Zod feedback schema | `schemas.ts:302-312`        | `createFeedbackSchema` with content max 5000                                |

### Critical Gaps

1. No API endpoint for users to edit their own feedback content
2. No ownership check pattern in feedback service (needs `userId` comparison)
3. `GET /api/feedback` behind `requireAdmin` — must be opened to all authenticated users
4. Frontend page has no conditional rendering based on role — all controls are always shown

---

## Phase 1: Shared Types & Validation

### Step 1.1: Add update-content type and schema

**Complexity:** S

**Acceptance criteria:**

- [ ] `UpdateFeedbackContentRequest` type exists in `api.ts` with `{ content: string }`
- [ ] `updateFeedbackContentSchema` Zod schema exists in `schemas.ts` (content: min 1, max 5000)
- [ ] Shared package builds cleanly: `npm run build --filter=@social-planner/shared`

**Sub-steps:**

a. Add `UpdateFeedbackContentRequest` interface after `UpdateFeedbackRequest` in `api.ts` (line ~560)
b. Add `updateFeedbackContentSchema` after `updateFeedbackSchema` in `schemas.ts` (line ~312), reuse the content validation from `createFeedbackSchema`
c. Verify build passes

**Files:**

- `packages/shared/src/types/api.ts`
- `packages/shared/src/validation/schemas.ts`

**Dependencies:** None

---

## Phase 2: API Backend

### Step 2.1: Open GET endpoint and add content-edit endpoint

**Complexity:** M

**Acceptance criteria:**

- [ ] `GET /api/feedback` returns 200 for any authenticated user (not just admin)
- [ ] `PATCH /api/feedback/:id/content` returns 200 when user edits own feedback
- [ ] `PATCH /api/feedback/:id/content` returns 403 when user edits another user's feedback
- [ ] `PATCH /api/feedback/:id` (status change) still returns 403 for non-admin users
- [ ] `DELETE /api/feedback/:id` still returns 403 for non-admin users
- [ ] API tests pass: `npm run test --filter=@social-planner/api`

**Sub-steps:**

a. In `feedback.ts`: remove `requireAdmin` from the GET route middleware chain (line 83)
b. In `feedback.service.ts`: add `updateFeedbackContent(feedbackId, userId, content)` function after `updateFeedbackStatus` (line ~269). Look up feedback, verify `feedback.userId === userId` (throw 403 if not), update content, return formatted result
c. In `feedback.ts`: add `PATCH /:id/content` route **before** the existing `PATCH /:id` route (so Express matches the more specific path first). Use `requireAuth` only (no `requireAdmin`), validate with `updateFeedbackContentSchema`, call `feedbackService.updateFeedbackContent(req.params.id, req.user!.id, req.body.content)`
d. Import `updateFeedbackContentSchema` in the route file
e. Verify existing tests still pass

**Files:**

- `apps/api/src/routes/feedback.ts`
- `apps/api/src/services/feedback.service.ts`

**Dependencies:** Step 1.1

---

## Phase 3: Frontend Hooks & Routing

### Step 3.1: Add mutation hook and open route

**Complexity:** S

**Acceptance criteria:**

- [ ] `useUpdateFeedbackContent()` hook exists, calls `PATCH /feedback/:id/content`
- [ ] Feedback route in `router.tsx` no longer requires ADMIN role
- [ ] Feedback nav item in `Layout.tsx` no longer has `requiresAdmin: true`
- [ ] Web package builds cleanly: `npm run build --filter=@social-planner/web`

**Sub-steps:**

a. In `useFeedback.ts`: add `useUpdateFeedbackContent()` mutation hook after `useUpdateFeedback` (line ~94). Follow same pattern: `api.patch<FeedbackSummary>(\`/feedback/${id}/content\`, { content })`, invalidate `feedbackKeys.all`, toast success "Feedback updated"
b. In `router.tsx`: remove the `<ProtectedRoute requiredRole="ADMIN">`wrapper from the feedback route (line 186–192). The parent route already enforces authentication
c. In`Layout.tsx`: remove `requiresAdmin: true` from the Feedback nav item (line 276)

**Files:**

- `apps/web/src/hooks/useFeedback.ts`
- `apps/web/src/router.tsx`
- `apps/web/src/components/Layout.tsx`

**Dependencies:** Step 2.1

---

## Phase 4: Feedback Page UI

### Step 4.1: Add role-based rendering and inline edit

**Complexity:** M

**Acceptance criteria:**

- [ ] Non-admin users see the feedback page with all submissions listed
- [ ] Status column shows a static badge (not dropdown) for non-admin users
- [ ] Delete button is hidden for non-admin users
- [ ] "Edit" link appears on user's own feedback items only
- [ ] Clicking Edit replaces content with a textarea + Save/Cancel buttons
- [ ] Save calls the update-content API and exits edit mode on success
- [ ] Cancel exits edit mode without saving
- [ ] Page subtitle reads "View and manage feedback" (not "Review and manage user feedback")
- [ ] Admin users retain full functionality (status dropdown, delete, edit own)

**Sub-steps:**

a. Import `useUpdateFeedbackContent` from hooks and `useUser`, `useIsAdmin` from `authStore`
b. Add state: `editingId` (string | null), `editContent` (string)
c. Add handlers: `handleEditClick` (sets editing state), `handleEditSave` (calls mutation, clears on success), `handleEditCancel` (clears state)
d. Update page subtitle text (line 97)
e. Extend `FeedbackItemProps` interface with: `isAdmin`, `currentUserId`, `editingId`, `editContent`, `onEditClick`, `onEditContentChange`, `onEditSave`, `onEditCancel`, `isEditSaving`
f. Pass new props to `FeedbackRow` and `FeedbackCard` components
g. In `FeedbackRow`: wrap status `<select>` in `isAdmin` conditional (show static badge for non-admins), add inline edit mode for content column when `editingId === feedback.id`, show "Edit" link for own feedback and "Delete" for admins in actions column
h. In `FeedbackCard`: same conditional patterns adapted for mobile layout

**Files:**

- `apps/web/src/pages/Feedback.tsx`

**Dependencies:** Step 3.1

---

## Risk Areas & Recommendations

| Component       | Issue                                               | Recommendation                                     |
| --------------- | --------------------------------------------------- | -------------------------------------------------- |
| Route ordering  | `PATCH /:id/content` must match before `PATCH /:id` | Define the `/content` route first in `feedback.ts` |
| Ownership check | User could try to edit another user's feedback      | Service layer throws 403 if `userId` doesn't match |
| Status editing  | Users should not change feedback status             | Keep `PATCH /:id` behind `requireAdmin`            |

### Breaking Changes

None expected — this is additive. The only behavioral change is `GET /api/feedback` becoming accessible to all authenticated users (previously admin-only).

### Testing Recommendations

- Manual browser test: log in as Editor, verify page loads, can see all feedback, can edit own, cannot change status or delete
- Manual browser test: log in as Admin, verify all existing admin features still work
- Run `npm run test:e2e` to verify no regressions

### Quick Wins

Step 1.1 (types/validation) and Step 3.1 (hook/routing) are small and can be done quickly.

---

## Progress Tracking

### Phase 1: Shared Types & Validation

- [ ] Step 1.1: Add update-content type and schema

### Phase 2: API Backend

- [ ] Step 2.1: Open GET endpoint and add content-edit endpoint

### Phase 3: Frontend Hooks & Routing

- [ ] Step 3.1: Add mutation hook and open route

### Phase 4: Feedback Page UI

- [ ] Step 4.1: Add role-based rendering and inline edit
