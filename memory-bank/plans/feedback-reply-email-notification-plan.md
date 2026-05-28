# Plan: Feedback Reply Email Notification

> Two-way email notifications for feedback reply threads: poster ↔ admins

| Field   | Value                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| Created | 2026-03-04                                                                                     |
| Status  | Completed                                                                                      |
| Target  | Email the original poster when an admin replies, and email admins when the poster replies back |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Audit References

| File                                     | Purpose                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| `CLAUDE.md`                              | Project conventions, code patterns, API resource pattern |
| `apps/api/src/services/email.service.ts` | Email template patterns and styling conventions          |

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
│     - `/code-reviewer` against `CLAUDE.md`, email patterns  │
│     - Verify email HTML escapes all user input              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UPDATE PROGRESS                                         │
│     - Mark step as completed in Progress Tracking section   │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

- [ ] `/audit-loop` was used for implementation (test-first)
- [ ] `/code-reviewer` audit passed
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced
- [ ] All user-controlled values HTML-escaped in email templates

---

## Context

### Current State

- Feedback system supports creating feedback and replying via `feedback.service.ts`
- When feedback is **created**, admins get both in-app notification AND email (`sendFeedbackEmailToAdmins()`)
- When a **reply** is posted by someone other than the poster, the original poster only gets an in-app notification (`createNotification` with type `FEEDBACK_REPLY`) — no email
- When the **original poster replies back**, nobody is notified (no in-app, no email)
- Email service (`email.service.ts`) has 4 existing email template functions: `sendReviewRequestEmail`, `sendCollaboratorAddedEmail`, `sendPasswordResetEmail`, `sendInvitationEmail`
- All templates use inline HTML with consistent styling (indigo `#6366f1` brand color, system fonts, 600px container)
- `notifyAdmins(type, data)` exists in notification service — sends in-app notifications to all admins

### Key Patterns Found

- **Email template function pattern:** Each template is an exported `async function` in `email.service.ts` with a typed data interface, HTML + plain text body, and returns `Promise<boolean>` via `sendEmail()`
- **Fire-and-forget pattern:** Email calls use `.catch(() => {})` since email failures are non-critical
- **HTML escaping:** All user-controlled values are escaped with `escapeHtml()` before insertion into HTML templates
- **Content truncation:** Preview content is truncated to 150-200 chars
- **Existing reply notification code** (lines 400-412 in `feedback.service.ts`): Handles `feedback.userId !== authorId` case only — no `else` branch for the reverse direction
- **Admin email pattern:** `sendFeedbackEmailToAdmins()` queries all admins, uses `Promise.allSettled()` to send to each
- **Test mocking pattern:** `vi.mock('./email.service', ...)` with `vi.fn().mockResolvedValue(true)`, async operations tested with `await new Promise(resolve => setTimeout(resolve, 10))`

### Critical Gaps

- No `sendFeedbackReplyEmail` function exists in `email.service.ts`
- No `FeedbackReplyEmailData` interface exists
- The reply notification block in `feedback.service.ts` (lines 400-412) only handles the "someone else replies to poster" case — no email, and no reverse direction
- The feedback author's email is not currently fetched in the reply flow — needs to be included in the Prisma query
- No in-app notification for admins when poster replies back (only email planned, but in-app should be added too for consistency)

---

## Phase 1: Email Template

### Step 1.1: Add `sendFeedbackReplyEmail` to email service

**Complexity:** S

**Acceptance criteria:**

- [ ] `FeedbackReplyEmailData` interface exported from `email.service.ts` with fields: `recipientEmail`, `recipientName`, `replyAuthorName`, `feedbackContent` (truncated preview), `replyContent` (truncated preview), `feedbackUrl`
- [ ] `sendFeedbackReplyEmail(data)` exported async function that calls `sendEmail()` with HTML + plain text
- [ ] Email subject: `${replyAuthorName} replied to your feedback`
- [ ] All user-controlled values HTML-escaped
- [ ] Content fields truncated to 200 chars
- [ ] HTML styling matches existing email templates (indigo brand, 600px container, system fonts)
- [ ] Unit test verifies `sendEmail` is called with correct `to`, `subject`, `html`, and `text` fields
- [ ] Unit test verifies HTML escaping of user input

**Sub-steps:**

a. Add `FeedbackReplyEmailData` interface to `email.service.ts` following the pattern of `CollaboratorEmailData`
b. Implement `sendFeedbackReplyEmail()` with HTML template matching existing style (use `sendCollaboratorAddedEmail` as reference)
c. Include both HTML and plain text versions
d. Add unit tests for the new function

**Files:**

- `apps/api/src/services/email.service.ts`
- `apps/api/src/services/email.service.test.ts` (create if needed, or add to existing test file)

**Dependencies:** None

---

## Phase 2: Integration

### Step 2.1: Email original poster when someone else replies

**Complexity:** S

**Acceptance criteria:**

- [ ] When a reply is created by someone other than the feedback author, `sendFeedbackReplyEmail` is called fire-and-forget targeting the original poster
- [ ] The feedback author's `email` and `fullName` are fetched (extend the Prisma `findUnique` select in `createReply`)
- [ ] The feedback `content` is included for context in the email
- [ ] `feedbackUrl` points to `/feedback` page
- [ ] Existing in-app notification still works (not broken)
- [ ] Unit test verifies `sendFeedbackReplyEmail` is called with correct data
- [ ] Unit test verifies email is NOT sent when user replies to their own feedback

**Sub-steps:**

a. Extend the Prisma `findUnique` query in `createReply()` to also select `user: { select: { email: true, fullName: true } }` and `content`
b. Inside the existing `if (feedback.userId !== authorId)` block, add a fire-and-forget call to `sendFeedbackReplyEmail` after the in-app notification
c. Add/update tests in `feedback.service.test.ts` to verify email sending and the no-self-email guard

**Files:**

- `apps/api/src/services/feedback.service.ts`
- `apps/api/src/services/feedback.service.test.ts`

**Dependencies:** Step 1.1

---

### Step 2.2: Notify admins when original poster replies back

**Complexity:** S

**Acceptance criteria:**

- [ ] When the feedback author creates a reply (`feedback.userId === authorId`), all admins receive an email via `sendFeedbackReplyEmail`
- [ ] All admins also receive an in-app notification (`notifyAdmins('FEEDBACK_REPLY', ...)`) for consistency
- [ ] Admin emails are fetched with the same pattern as `sendFeedbackEmailToAdmins()` (query all `role: 'ADMIN'` users)
- [ ] `feedbackUrl` points to `/feedback` page
- [ ] Unit test verifies admins are emailed when poster replies
- [ ] Unit test verifies admins are NOT emailed when a non-poster (e.g. another admin) replies

**Sub-steps:**

a. Add an `else` branch in `createReply()` for when `feedback.userId === authorId`
b. In that branch, query all admin users (email + fullName), then fire-and-forget `sendFeedbackReplyEmail` to each admin using `Promise.allSettled()` (same pattern as `sendFeedbackEmailToAdmins`)
c. Also call `notificationService.notifyAdmins('FEEDBACK_REPLY', { feedbackId, replyAuthorName })` for in-app notifications
d. Add tests verifying the admin notification path

**Files:**

- `apps/api/src/services/feedback.service.ts`
- `apps/api/src/services/feedback.service.test.ts`

**Dependencies:** Step 2.1

---

## Risk Areas & Recommendations

| Component               | Issue                                                                       | Recommendation                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML injection          | Reply content and author names are user-controlled                          | Use `escapeHtml()` on all interpolated values (existing pattern)                                                                                                        |
| Email spam              | Frequent back-and-forth could generate many emails                          | Acceptable for now — feedback threads are typically short; consider batching later if needed                                                                            |
| Prisma query            | Adding `user.email` and `content` to the feedback lookup changes the select | Verify the extended select doesn't break other code consuming the same query                                                                                            |
| Admin self-notification | An admin replying to feedback they submitted themselves                     | The `userId === authorId` branch sends to all admins — the replying admin would get their own email. Consider filtering out the replying admin from the recipient list. |

### Breaking Changes

None expected. This is a purely additive change.

### Testing Recommendations

- Test fire-and-forget pattern: verify reply creation succeeds even if email sending throws
- Test the no-self-email guard: no poster email when author replies to their own feedback
- Test admin direction: admins get emailed when poster replies, not when another admin replies
- Manual test with MailHog: submit feedback as user, reply as admin (check user inbox), reply back as user (check admin inbox) — all at `http://localhost:8025`

---

## Progress Tracking

### Phase 1: Email Template

- [x] Step 1.1: Add `sendFeedbackReplyEmail` to email service _(completed 2026-03-04)_

### Phase 2: Integration

- [x] Step 2.1: Email original poster when someone else replies _(completed 2026-03-04)_
- [x] Step 2.2: Notify admins when original poster replies back _(completed 2026-03-04)_
