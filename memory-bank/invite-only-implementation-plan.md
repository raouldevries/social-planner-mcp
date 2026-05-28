# Invite-Only Authentication System Implementation Plan

## Overview

Convert the Social Planner from open registration to an invite-only system where:

- Users cannot self-register
- Only admins can invite new users via email
- OAuth logins (Google/Microsoft) also require prior invitation
- Invited users receive an email with a secure link to complete registration

## Design Decisions

### Single-Tenant Architecture

The system is single-workspace ("all users share the Acme workspace"). No organization/tenant scoping is needed - all invitations are for the single Acme workspace.

### Invitations Strictly Bound to Email

For security, invitations are tied to a specific email address:

- Token alone is not sufficient - email must match
- During accept: verify provided email matches invitation email
- During OAuth: match OAuth profile email to pending invitation email
- Prevents invitation link sharing or theft

### Password Optional with OAuth

- Users accepting via email link: password required
- Users accepting via OAuth (Google/Microsoft): password NOT required
- OAuth-only accounts are valid (matches existing architecture)
- Accept page offers both options: "Set password" form OR "Continue with Google/Microsoft"

## Database Schema Changes

### New `Invitation` Model

```prisma
model Invitation {
  id            String           @id @default(cuid())
  email         String           // Normalized: lowercase, trimmed
  tokenHash     String           @unique // SHA-256 hash of token (never store raw token)
  role          UserRole         @default(EDITOR)
  invitedById   String
  invitedBy     User             @relation("InvitedBy", fields: [invitedById], references: [id])
  acceptedById  String?          // User who accepted (for audit trail)
  acceptedBy    User?            @relation("AcceptedInvitation", fields: [acceptedById], references: [id])
  status        InvitationStatus @default(PENDING)
  expiresAt     DateTime
  acceptedAt    DateTime?
  revokedAt     DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@unique([email, status]) // Only one PENDING invitation per email
  @@index([email])
  @@index([tokenHash])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

**Key Design Notes:**

- `tokenHash`: Store SHA-256 hash, not raw token. Compare using constant-time comparison.
- `email`: Always normalized (lowercase, trimmed) before storage and lookup.
- `@@unique([email, status])`: Allows re-inviting after expiry/revocation while preventing duplicate pending invites.
- `acceptedById`: Audit trail linking to the created user.

### User Model Update

```prisma
model User {
  // ... existing fields
  invitationsSent     Invitation[] @relation("InvitedBy")
  acceptedInvitation  Invitation?  @relation("AcceptedInvitation")
}
```

## Token Security

### Token Generation & Storage

```typescript
import crypto from 'crypto';

// Generate cryptographically secure token
const token = crypto.randomBytes(32).toString('hex'); // 64 chars

// Hash for storage
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// Send raw token in email URL
const acceptUrl = `${FRONTEND_URL}/accept-invite/${token}`;

// Store only hash in database
await prisma.invitation.create({
  data: { tokenHash, email: normalizedEmail, ... }
});
```

### Token Validation

```typescript
import { timingSafeEqual } from 'crypto';

function validateToken(providedToken: string, storedHash: string): boolean {
  const providedHash = crypto.createHash('sha256').update(providedToken).digest('hex');
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));
}
```

## Email Normalization

All email addresses must be normalized before any operation:

```typescript
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
```

Apply in:

- Invitation creation
- Invitation validation/lookup
- OAuth callback email matching
- Registration check
- Admin invitation search

## API Changes

### New Endpoints

#### `POST /api/invitations` (Admin only)

Create a new invitation and send email.

**Authorization:** Requires `UserRole.ADMIN` (enforced via `requireRole(UserRole.ADMIN)` middleware)

**Role Constraints:** Admins can invite EDITOR or VIEWER roles only. Cannot invite ADMIN (requires separate admin promotion flow).

```typescript
Request: { email: string, role?: 'EDITOR' | 'VIEWER' }
Response: { id, email, role, status, expiresAt, createdAt, invitedBy: { id, fullName } }

Errors:
- 400: Invalid email format
- 400: Role must be EDITOR or VIEWER
- 409: User with this email already exists
- 409: Pending invitation already exists for this email
```

**Logic:**

1. Normalize email
2. Check if user already exists with this email → 409
3. Check if PENDING invitation exists for this email → 409 (suggest resend)
4. Generate secure token, hash it
5. Create invitation record
6. Send invitation email
7. Log audit event: `INVITATION_CREATED`

#### `POST /api/invitations/:id/resend` (Admin only)

Resend/refresh an existing invitation with new token and expiry.

```typescript
Response: { id, email, role, status, expiresAt, createdAt }

Errors:
- 404: Invitation not found
- 400: Cannot resend - invitation already accepted
- 400: Cannot resend - invitation revoked
```

**Logic:**

1. Find invitation by ID
2. If ACCEPTED or REVOKED → error
3. Generate new token, hash it
4. Update tokenHash and expiresAt (7 days from now)
5. If was EXPIRED, set status back to PENDING
6. Send new invitation email
7. Log audit event: `INVITATION_RESENT`

#### `GET /api/invitations` (Admin only)

List all invitations with filtering.

```typescript
Query: { status?: InvitationStatus, email?: string, page?: number, limit?: number }
Response: {
  invitations: Array<{
    id, email, role, status, expiresAt, createdAt,
    invitedBy: { id, fullName },
    acceptedBy?: { id, fullName },
    acceptedAt?, revokedAt?
  }>,
  total: number
}
```

#### `DELETE /api/invitations/:id` (Admin only)

Revoke a pending invitation.

```typescript
Response: { id, email, role, status: 'REVOKED', revokedAt }

Errors:
- 404: Invitation not found
- 400: Cannot revoke - invitation already accepted
- 400: Cannot revoke - invitation already revoked
```

**Logic:**

1. Find invitation by ID
2. If ACCEPTED or already REVOKED → error
3. Set status = REVOKED, revokedAt = now()
4. Log audit event: `INVITATION_REVOKED`

#### `GET /api/invitations/validate/:token` (Public)

Validate an invitation token before showing accept form.

**Rate Limiting:** 10 requests per minute per IP

```typescript
Response (valid): {
  valid: true,
  email: string,  // Partially masked: j***@example.com
  role: UserRole
}
Response (invalid): {
  valid: false,
  reason: 'invalid' | 'expired' | 'already_used' | 'revoked'
}
```

**Note:** Email is partially masked to prevent enumeration while still letting user confirm it's theirs.

#### `POST /api/invitations/:token/accept` (Public)

Accept invitation and create account.

**Rate Limiting:** 5 requests per minute per IP

```typescript
Request: {
  fullName: string,
  password?: string  // Required unless acceptViaOAuth is true
}
Response: { user, tokens } // Same as current register response

Errors:
- 400: Invalid token
- 400: Invitation expired
- 400: Invitation already used
- 400: Invitation revoked
- 400: Password required (when not using OAuth)
- 409: User with this email already exists
```

**Critical: Must be atomic transaction:**

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Find and validate invitation (with row lock)
  const invitation = await tx.invitation.findFirst({
    where: { tokenHash: computedHash, status: 'PENDING' },
  });
  if (!invitation) throw new AppError('Invalid invitation', 400);
  if (invitation.expiresAt < new Date()) throw new AppError('Invitation expired', 400);

  // 2. Check user doesn't already exist
  const existingUser = await tx.user.findUnique({ where: { email: invitation.email } });
  if (existingUser) throw new AppError('User already exists', 409);

  // 3. Create user
  const user = await tx.user.create({
    data: {
      email: invitation.email,
      fullName,
      password: password ? await hashPassword(password) : null,
      role: invitation.role,
    },
  });

  // 4. Mark invitation accepted
  await tx.invitation.update({
    where: { id: invitation.id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      acceptedById: user.id,
    },
  });

  return user;
});
```

### Modified Endpoints

#### `POST /api/auth/register`

Disabled - returns 403.

```typescript
Response: {
  error: 'Registration is invite-only',
  message: 'Please contact an administrator to request access.'
}
```

#### OAuth Callbacks (`/api/auth/google/callback`, `/api/auth/microsoft/callback`)

**Modified Flow:**

```typescript
async function handleOAuthCallback(profile: OAuthProfile) {
  const normalizedEmail = normalizeEmail(profile.email);

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    // Existing user - normal OAuth login flow
    // Link provider if not already linked
    return existingUser;
  }

  // 2. New user - check for pending invitation
  const invitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (!invitation) {
    // No invitation - redirect with error
    // Generic message to prevent email enumeration
    return redirect(`${FRONTEND_URL}/login?error=access_denied`);
  }

  // 3. Create user and accept invitation atomically
  await prisma.$transaction(async (tx) => {
    // Re-check invitation hasn't been used (race condition protection)
    const freshInvitation = await tx.invitation.findUnique({
      where: { id: invitation.id },
    });
    if (freshInvitation?.status !== 'PENDING') {
      throw new Error('Invitation no longer valid');
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        fullName: profile.displayName || profile.email.split('@')[0],
        role: invitation.role,
        googleId: provider === 'google' ? profile.id : undefined,
        microsoftId: provider === 'microsoft' ? profile.id : undefined,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    // Log audit event
    await logAuditEvent(tx, 'INVITATION_ACCEPTED_OAUTH', {
      invitationId: invitation.id,
      userId: user.id,
      provider,
    });

    return user;
  });
}
```

**OAuth Error Handling:**

- `access_denied`: Generic error for no invitation (prevents email enumeration)
- `invitation_expired`: Invitation exists but expired
- `account_exists`: Email already registered with different provider

## Audit Logging

Add audit events for compliance:

```typescript
enum AuditEventType {
  INVITATION_CREATED = 'INVITATION_CREATED',
  INVITATION_RESENT = 'INVITATION_RESENT',
  INVITATION_REVOKED = 'INVITATION_REVOKED',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  INVITATION_ACCEPTED_OAUTH = 'INVITATION_ACCEPTED_OAUTH',
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
}

// Log to ActivityLog table (already exists)
await prisma.activityLog.create({
  data: {
    action: eventType,
    entityType: 'Invitation',
    entityId: invitationId,
    userId: actorId,
    metadata: { ip, userAgent, ...details },
  },
});
```

## Email Template

### `invitation.hbs`

```html
Subject: You've been invited to Social Planner Hi, {{inviterName}} has invited you to join
Social Planner as {{#if isEditor}}an Editor{{else}}a Viewer{{/if}}. Click the link below to create
your account: {{acceptUrl}} You can also sign in with Google or Microsoft using this email address
({{email}}). This invitation expires on {{expiryDate}}. If you didn't expect this invitation, you
can safely ignore this email. Best regards, The Acme Team
```

## Frontend Changes

### New Pages/Components

#### `AcceptInvitation.tsx` (New page at `/accept-invite/:token`)

**States to handle:**

1. `loading` - Validating token
2. `valid` - Show accept form
3. `invalid` - Token not found or malformed
4. `expired` - Token expired (show "Request new invitation" message)
5. `already_used` - Already accepted
6. `revoked` - Invitation revoked
7. `already_registered` - User already exists (show login link)
8. `submitting` - Form submission in progress
9. `success` - Account created, redirecting

**Form fields:**

- Email (read-only, partially shown from validate response)
- Full name (required)
- Password (optional if using OAuth)
- "Continue with Google" button
- "Continue with Microsoft" button

**Flow:**

1. On mount: Call `GET /api/invitations/validate/:token`
2. If invalid/expired/etc: Show appropriate message
3. If valid: Show form with OAuth options
4. On form submit: Call `POST /api/invitations/:token/accept`
5. On OAuth click: Redirect to OAuth flow (token stored in localStorage for return)
6. On success: Auto-login and redirect to Calendar

#### `InviteUserModal.tsx` (New component)

- Email input with validation
- Role dropdown (EDITOR, VIEWER only)
- Submit button
- Loading/error states
- Success toast with "invitation sent" message

### Modified Pages

#### `Users.tsx`

- Add "Invite User" button (visible only to admins)
- Add "Pending Invitations" tab/section:
  - Table: Email, Role, Invited By, Expires, Actions
  - Actions: Resend, Revoke
- Add "Expired/Revoked" collapsed section for history

#### `Register.tsx`

Replace form with:

```
Registration is invite-only.

If you need access to Social Planner, please contact an administrator.

Already have an account? [Log in]
```

#### `Login.tsx`

Handle OAuth errors:

- `access_denied`: "Access denied. If you need an account, please contact an administrator."
- `invitation_expired`: "Your invitation has expired. Please contact an administrator for a new invitation."
- `account_exists`: "An account with this email already exists. Try a different sign-in method."

## Rate Limiting

Add rate limiting to public endpoints:

```typescript
// In apps/api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const invitationValidateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests, please try again later' },
});

export const invitationAcceptLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later' },
});
```

## Implementation Steps

### Phase 1: Database & Backend (Core)

1. Add Invitation model and enum to Prisma schema
2. Run migration
3. Create `invitation.service.ts` with:
   - Token generation and hashing utilities
   - Email normalization utility
   - CRUD operations with transactions
   - Audit logging integration
4. Create `invitations.ts` routes with:
   - Admin authorization middleware
   - Rate limiting on public endpoints
5. Create invitation email template
6. Add invitation types to shared package
7. Add invitation Zod schemas

### Phase 2: OAuth Modifications

1. Modify `auth.service.ts` OAuth handlers to check invitations
2. Add transactional user creation + invitation acceptance
3. Handle OAuth edge cases (existing user, no invitation, expired)
4. Update OAuth redirect error handling

### Phase 3: Disable Open Registration

1. Modify `auth.service.ts` register function to return 403
2. Keep endpoint for backwards compatibility but reject all requests

### Phase 4: Frontend - Invitation Flow

1. Create `AcceptInvitation.tsx` page with all states
2. Add route `/accept-invite/:token` to App.tsx
3. Create `useInvitations.ts` hook
4. Update Register.tsx with invite-only message
5. Update Login.tsx with OAuth error handling

### Phase 5: Frontend - Admin UI

1. Create `InviteUserModal.tsx` component
2. Update `Users.tsx` with:
   - Invite button (admin only)
   - Pending invitations section
   - Resend/revoke actions

### Phase 6: Testing & Cleanup

1. Unit tests for invitation.service.ts:
   - Token generation and hashing
   - Email normalization
   - Expiry checking
2. Integration tests:
   - Create invitation
   - Validate token
   - Accept invitation
   - OAuth with invitation
   - Concurrent acceptance (race condition)
   - Re-invite after expiry
   - Case-insensitive email handling
3. E2E tests:
   - Full invitation flow via email
   - Full invitation flow via OAuth
   - Admin invite/resend/revoke flow
4. Run full audit (build, lint, tests)

## Security Checklist

- [ ] Tokens generated with `crypto.randomBytes(32)`
- [ ] Only token hash stored in database
- [ ] Token comparison uses `timingSafeEqual`
- [ ] Email normalized everywhere (lowercase, trim)
- [ ] Accept flow wrapped in database transaction
- [ ] OAuth flow wrapped in database transaction
- [ ] Rate limiting on validate and accept endpoints
- [ ] Admin-only routes protected by `requireRole(UserRole.ADMIN)`
- [ ] Role constraints enforced (no ADMIN invitations)
- [ ] Generic error messages on public endpoints (prevent enumeration)
- [ ] Audit logging for all invitation actions
- [ ] Expired tokens rejected at runtime

## Files to Create/Modify

### Create

- `packages/database/prisma/migrations/xxx_add_invitation_model/migration.sql`
- `apps/api/src/services/invitation.service.ts`
- `apps/api/src/routes/invitations.ts`
- `apps/api/src/middleware/rateLimit.ts`
- `apps/api/src/templates/invitation.hbs`
- `apps/web/src/pages/AcceptInvitation.tsx`
- `apps/web/src/hooks/useInvitations.ts`
- `apps/web/src/components/users/InviteUserModal.tsx`

### Modify

- `packages/database/prisma/schema.prisma`
- `packages/shared/src/types/api.ts` (add invitation types)
- `packages/shared/src/validation/schemas.ts` (add invitation schemas)
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/app.ts`
- `apps/web/src/pages/Users.tsx`
- `apps/web/src/pages/Register.tsx`
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/App.tsx` (add route)

## Verification

### Manual Testing

1. As admin, invite a new user via Users page
2. Check email is received (MailHog in dev)
3. Click invitation link, complete registration with password
4. Verify new user can log in
5. As admin, invite another user
6. Have that user accept via Google OAuth (without clicking link)
7. Verify user created with correct role from invitation
8. Try direct registration - should be blocked
9. Try OAuth without invitation - should show "Access denied"
10. Test resend on pending/expired invitation
11. Test revoke on pending invitation
12. Test expired invitation shows appropriate message

### Automated Tests

- Unit tests for invitation.service.ts
- Integration tests for invitation endpoints
- Race condition test for concurrent acceptance
- E2E test for full invitation flow
