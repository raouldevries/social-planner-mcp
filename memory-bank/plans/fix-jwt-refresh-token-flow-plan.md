# Plan: Fix JWT Refresh Token Flow

> Fix broken refresh token mechanism so users stay logged in beyond the 15-minute access token expiry

| Field   | Value                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------ |
| Created | 2026-03-03                                                                                       |
| Status  | Planning                                                                                         |
| Target  | Fix broken refresh token mechanism causing premature logouts after 15-minute access token expiry |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Audit References

| File                                        | Purpose                                       |
| ------------------------------------------- | --------------------------------------------- |
| `CLAUDE.md`                                 | Project code patterns and conventions         |
| `packages/shared/src/validation/schemas.ts` | Zod validation schemas (refresh token schema) |

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
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UPDATE PROGRESS                                         │
│     - Mark step as completed in Progress Tracking section   │
│     - Add notes about any deviations or learnings           │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

- [ ] `/audit-loop` was used for implementation (test-first)
- [ ] `/code-reviewer` audit passed
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced
- [ ] Existing auth tests still pass (`npm run test --filter=@social-planner/api`)

---

## Context

### Current State

The JWT authentication system has **access tokens (15m)** and **refresh tokens (7d)**. The backend correctly:

- Returns `{ accessToken, refreshToken, user }` from login, register, refresh, and OAuth flows
- Validates refresh tokens via `refreshTokenSchema` (Zod: `{ refreshToken: string }`)
- Stores sessions in Redis with 7-day TTL, rotates refresh tokens on each refresh
- Deletes old session and creates new one during token rotation (preventing reuse)

The frontend is broken in 3 places, causing the refresh flow to silently fail.

### Key Patterns Found

- **Backend AuthResult interface** (`apps/api/src/services/auth.service.ts:21-32`): Returns `{ accessToken, refreshToken, user }`
- **Refresh endpoint validation** (`packages/shared/src/validation/schemas.ts:32-34`): Requires `{ refreshToken: string }` in request body
- **OAuth callback** (`apps/web/src/hooks/useAuth.ts:225-227`): Correctly stores both tokens — this is the pattern to replicate
- **Auth store logout** (`apps/web/src/stores/authStore.ts:48-49`): Only clears `accessToken` from localStorage, not `refreshToken`
- **Logout hook** (`apps/web/src/hooks/useAuth.ts:118-119`): Calls `api.post('/auth/logout')` but doesn't send refresh token for targeted session deletion

### Critical Gaps

1. **`useLogin` / `useRegister` hooks** don't save `refreshToken` to localStorage (only `accessToken`)
2. **API interceptor** sends empty body `{}` to `/auth/refresh` instead of `{ refreshToken }` — fails Zod validation
3. **API interceptor** response type `{ accessToken: string }` is too narrow — doesn't capture `refreshToken` from response
4. **API interceptor** doesn't save the new `refreshToken` from the refresh response
5. **Auth store `logout()`** doesn't clear `refreshToken` from localStorage
6. **Logout hook** doesn't send `refreshToken` in logout request for targeted session invalidation

---

## Phase 1: Fix Refresh Token Storage and Flow

### Step 1.1: Update AuthResponse type and store refresh token on login/register

**Complexity:** S

**Acceptance criteria:**

- [ ] `AuthResponse` interface in `useAuth.ts` includes `refreshToken: string`
- [ ] `useLogin` `onSuccess` saves `refreshToken` to localStorage
- [ ] `useRegister` `onSuccess` saves `refreshToken` to localStorage
- [ ] Existing auth tests still pass

**Sub-steps:**

a. Update the `AuthResponse` interface (line 25-28 in `useAuth.ts`) to add `refreshToken: string`
b. In `useLogin` `onSuccess` callback (line 68-73), add `localStorage.setItem('refreshToken', data.refreshToken)` after the accessToken line
c. In `useRegister` `onSuccess` callback (line 95-100), add `localStorage.setItem('refreshToken', data.refreshToken)` after the accessToken line

**Files:**

- `apps/web/src/hooks/useAuth.ts`

**Dependencies:** None

---

### Step 1.2: Fix the API response interceptor refresh flow

**Complexity:** M

**Acceptance criteria:**

- [ ] Refresh request sends `{ refreshToken }` from localStorage in the request body
- [ ] Response type includes both `accessToken` and `refreshToken`
- [ ] Both new `accessToken` and `refreshToken` are saved to localStorage after successful refresh
- [ ] The retried original request uses the new access token

**Sub-steps:**

a. Update the response type on the refresh `axios.post` call (line 44) from `{ accessToken: string }` to `{ accessToken: string; refreshToken: string }`
b. Change the empty body `{}` (line 46) to `{ refreshToken: localStorage.getItem('refreshToken') }` — this sends the stored refresh token to the backend for validation
c. After line 50 (`localStorage.setItem('accessToken', ...)`), add `localStorage.setItem('refreshToken', data.refreshToken)` to persist the rotated refresh token
d. Add a guard: if no refresh token exists in localStorage, skip the refresh attempt and go straight to logout (prevents a pointless API call that will fail validation)

**Files:**

- `apps/web/src/lib/api.ts`

**Dependencies:** Step 1.1 (refresh token must be in localStorage to send it)

---

### Step 1.3: Clean up refresh token on logout

**Complexity:** S

**Acceptance criteria:**

- [ ] `authStore.logout()` removes `refreshToken` from localStorage alongside `accessToken`
- [ ] `useLogout` hook sends the refresh token in the logout API call for targeted session invalidation

**Sub-steps:**

a. In `authStore.ts` `logout()` action (line 48-55), add `localStorage.removeItem('refreshToken')` next to the existing `removeItem('accessToken')`
b. In `useAuth.ts` `useLogout` hook `mutationFn` (line 118-119), update the logout call to send the refresh token: `await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') })` — this allows the backend to delete the specific session instead of all sessions

**Files:**

- `apps/web/src/stores/authStore.ts`
- `apps/web/src/hooks/useAuth.ts`

**Dependencies:** None (can be done in parallel with 1.1/1.2, but logically grouped as Phase 1)

---

## Phase 2: Verification

### Step 2.1: Manual verification and test run

**Complexity:** S

**Acceptance criteria:**

- [ ] `npm run test --filter=@social-planner/api` passes (no regressions in backend auth tests)
- [ ] `npm run test --filter=@social-planner/web` passes (no regressions in frontend tests)
- [ ] `npm run build` succeeds (TypeScript compilation clean)

**Sub-steps:**

a. Run full test suite to verify no regressions
b. Run build to verify TypeScript types are consistent
c. Manual smoke test: log in, verify both tokens appear in localStorage, wait or manually expire the access token, confirm the app refreshes the token silently instead of redirecting to login

**Files:** None (verification only)

**Dependencies:** Steps 1.1, 1.2, 1.3

---

## Risk Areas & Recommendations

| Component                     | Issue                                                                 | Recommendation                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Token rotation race condition | Multiple concurrent 401s could trigger multiple refresh attempts      | The `_retry` flag on the original request already prevents infinite loops; consider adding a mutex/promise cache if issues arise post-fix      |
| Refresh token in localStorage | localStorage is accessible to XSS attacks                             | Acceptable for now (matches current `accessToken` storage pattern); httpOnly cookies would be more secure but is a larger architectural change |
| Existing logged-in users      | Users currently logged in won't have a `refreshToken` in localStorage | They'll get logged out one more time after deploy (the guard in Step 1.2d handles this gracefully)                                             |

### Breaking Changes

None expected. The backend API contract is unchanged — it already returns `refreshToken` in all auth responses. Only the frontend is being fixed to actually use it.

### Testing Recommendations

- After deploying, monitor for any increase in `/auth/refresh` 401 errors (should decrease dramatically)
- Verify OAuth login flow still works (it already stores refresh tokens correctly, so should be unaffected)

### Quick Wins

All three steps are quick wins — this is a targeted bugfix plan with no architectural changes.

---

## Progress Tracking

### Phase 1: Fix Refresh Token Storage and Flow

- [ ] Step 1.1: Update AuthResponse type and store refresh token on login/register
- [ ] Step 1.2: Fix the API response interceptor refresh flow
- [ ] Step 1.3: Clean up refresh token on logout

### Phase 2: Verification

- [ ] Step 2.1: Manual verification and test run
