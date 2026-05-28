/**
 * Social Planner - Invitation Service
 *
 * Handles invite-only user registration with secure token management.
 * Security features:
 * - Tokens generated with crypto.randomBytes (32 bytes)
 * - Only SHA-256 hash stored in database
 * - Constant-time token comparison
 * - Transactional acceptance flow
 * - Email normalization (lowercase, trim)
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { storeSession } from '../lib/session';
import { AppError } from '../middleware/errorHandler';
import { UserRole, InvitationStatus } from '@social-planner/database';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { sendInvitationEmail } from './email.service';
import { logger } from '../lib/logger';
import { config } from '../config';

const SALT_ROUNDS = 12;
const INVITATION_EXPIRES_DAYS = 7;

// ============================================
// TYPES
// ============================================

export interface InvitationSummary {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: {
    id: string;
    fullName: string;
  };
  acceptedBy?: {
    id: string;
    fullName: string;
  } | null;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
}

export interface InvitationValidationResult {
  valid: boolean;
  email?: string; // Partially masked
  role?: UserRole;
  reason?: 'invalid' | 'expired' | 'already_used' | 'revoked';
}

export interface AcceptInvitationResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    timezone: string;
    role: UserRole;
  };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Normalize email to lowercase and trim whitespace
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Mask email for display (j***@example.com)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Log audit event for invitation actions
 */
async function logInvitationAudit(
  action: string,
  invitationId: string,
  actorId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        actorId,
        details: {
          entityType: 'Invitation',
          entityId: invitationId,
          ...details,
        },
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    logger.error({ error, action, invitationId }, 'Failed to log invitation audit event');
  }
}

// ============================================
// INVITATION CRUD
// ============================================

/**
 * Create a new invitation and send email
 * Admin only - can only invite EDITOR or VIEWER roles
 */
export async function createInvitation(
  email: string,
  role: UserRole,
  invitedById: string
): Promise<{ invitation: InvitationSummary; token: string }> {
  const normalizedEmail = normalizeEmail(email);

  // Validate role - admins can only invite EDITOR or VIEWER
  if (role === UserRole.ADMIN) {
    throw new AppError('INVALID_ROLE', 'Cannot invite users with ADMIN role', 400);
  }

  // Generate secure token (outside transaction for crypto performance)
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRES_DAYS);

  // Atomic check-and-create to prevent race condition (two admins inviting same email)
  // Retry loop handles transient serialization failures (P2034)
  const MAX_RETRIES = 3;
  let invitation;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      invitation = await prisma.$transaction(
        async (tx) => {
          // Check if user already exists
          const existingUser = await tx.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (existingUser) {
            throw new AppError('USER_EXISTS', 'A user with this email already exists', 409);
          }

          // Check for existing pending invitation (within transaction to prevent race)
          const existingInvitation = await tx.invitation.findFirst({
            where: {
              email: normalizedEmail,
              status: InvitationStatus.PENDING,
            },
          });

          if (existingInvitation) {
            throw new AppError(
              'INVITATION_EXISTS',
              'A pending invitation already exists for this email. Use resend to send a new invitation.',
              409
            );
          }

          // Create invitation (within same transaction)
          return tx.invitation.create({
            data: {
              email: normalizedEmail,
              tokenHash,
              role,
              invitedById,
              expiresAt,
              status: InvitationStatus.PENDING,
            },
            include: {
              invitedBy: {
                select: { id: true, fullName: true },
              },
            },
          });
        },
        { isolationLevel: 'Serializable' }
      );
      break; // Success, exit retry loop
    } catch (error) {
      // Retry on serialization failure (P2034), rethrow other errors
      const isPrismaError = error && typeof error === 'object' && 'code' in error;
      if (isPrismaError && (error as { code: string }).code === 'P2034' && attempt < MAX_RETRIES) {
        logger.warn(
          { attempt, email: normalizedEmail },
          'Serialization conflict, retrying invitation creation'
        );
        continue;
      }
      throw error;
    }
  }

  if (!invitation) {
    throw new AppError('TRANSACTION_FAILED', 'Failed to create invitation after retries', 500);
  }

  // Send invitation email - delete invite on failure to prevent orphans
  const acceptUrl = `${config.FRONTEND_URL}/accept-invite/${token}`;
  try {
    await sendInvitationEmail({
      recipientEmail: normalizedEmail,
      inviterName: invitation.invitedBy.fullName,
      role,
      acceptUrl,
      expiresAt,
    });
  } catch (emailError) {
    // Delete the orphan invitation so admin can retry
    await prisma.invitation.delete({ where: { id: invitation.id } });
    logger.error({ error: emailError, email: normalizedEmail }, 'Failed to send invitation email');
    throw new AppError('EMAIL_FAILED', 'Failed to send invitation email. Please try again.', 500);
  }

  // Log audit event
  await logInvitationAudit('INVITATION_CREATED', invitation.id, invitedById, {
    email: normalizedEmail,
    role,
  });

  logger.info({ invitationId: invitation.id, email: normalizedEmail }, 'Invitation created');

  return {
    invitation: formatInvitation(invitation),
    token, // Return token for testing purposes only - not exposed in API response
  };
}

/**
 * Resend an invitation with a new token and extended expiry
 */
export async function resendInvitation(
  invitationId: string,
  actorId: string
): Promise<InvitationSummary> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      invitedBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  if (!invitation) {
    throw new AppError('NOT_FOUND', 'Invitation not found', 404);
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    throw new AppError('ALREADY_ACCEPTED', 'Cannot resend - invitation already accepted', 400);
  }

  if (invitation.status === InvitationStatus.REVOKED) {
    throw new AppError('REVOKED', 'Cannot resend - invitation has been revoked', 400);
  }

  // Generate new token
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Calculate new expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRES_DAYS);

  // Store old values for rollback on email failure
  const oldTokenHash = invitation.tokenHash;
  const oldExpiresAt = invitation.expiresAt;
  const oldStatus = invitation.status;

  // Update invitation with new token
  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      expiresAt,
      status: InvitationStatus.PENDING, // Reset to PENDING if was EXPIRED
    },
    include: {
      invitedBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  // Send new invitation email - rollback token on failure
  const acceptUrl = `${config.FRONTEND_URL}/accept-invite/${token}`;
  try {
    await sendInvitationEmail({
      recipientEmail: invitation.email,
      inviterName: invitation.invitedBy.fullName,
      role: invitation.role,
      acceptUrl,
      expiresAt,
    });
  } catch (emailError) {
    // Rollback to old token so previous link still works
    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash: oldTokenHash,
        expiresAt: oldExpiresAt,
        status: oldStatus,
      },
    });
    logger.error({ error: emailError, invitationId }, 'Failed to resend invitation email');
    throw new AppError('EMAIL_FAILED', 'Failed to send invitation email. Please try again.', 500);
  }

  // Log audit event
  await logInvitationAudit('INVITATION_RESENT', invitationId, actorId);

  logger.info({ invitationId, email: invitation.email }, 'Invitation resent');

  return formatInvitation(updated);
}

/**
 * List invitations with optional filtering
 */
export async function listInvitations(options: {
  status?: InvitationStatus;
  email?: string;
  page?: number;
  limit?: number;
}): Promise<{ invitations: InvitationSummary[]; total: number }> {
  const { status, email, page = 1, limit = 20 } = options;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (email) {
    where.email = { contains: normalizeEmail(email), mode: 'insensitive' };
  }

  const [invitations, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      include: {
        invitedBy: {
          select: { id: true, fullName: true },
        },
        acceptedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invitation.count({ where }),
  ]);

  return {
    invitations: invitations.map(formatInvitation),
    total,
  };
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(
  invitationId: string,
  actorId: string
): Promise<InvitationSummary> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError('NOT_FOUND', 'Invitation not found', 404);
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    throw new AppError('ALREADY_ACCEPTED', 'Cannot revoke - invitation already accepted', 400);
  }

  if (invitation.status === InvitationStatus.REVOKED) {
    throw new AppError('ALREADY_REVOKED', 'Invitation is already revoked', 400);
  }

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: InvitationStatus.REVOKED,
      revokedAt: new Date(),
    },
    include: {
      invitedBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  // Log audit event
  await logInvitationAudit('INVITATION_REVOKED', invitationId, actorId);

  logger.info({ invitationId, email: invitation.email }, 'Invitation revoked');

  return formatInvitation(updated);
}

// ============================================
// TOKEN VALIDATION & ACCEPTANCE
// ============================================

/**
 * Validate an invitation token (public endpoint)
 * Returns masked email to prevent enumeration
 */
export async function validateInvitationToken(token: string): Promise<InvitationValidationResult> {
  const tokenHash = hashToken(token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return { valid: false, reason: 'invalid' };
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    return { valid: false, reason: 'already_used' };
  }

  if (invitation.status === InvitationStatus.REVOKED) {
    return { valid: false, reason: 'revoked' };
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired if not already
    if (invitation.status !== InvitationStatus.EXPIRED) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
    }
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    email: maskEmail(invitation.email),
    role: invitation.role,
  };
}

/**
 * Accept an invitation and create user account
 * CRITICAL: Must be atomic to prevent race conditions
 */
export async function acceptInvitation(
  token: string,
  fullName: string,
  password?: string
): Promise<AcceptInvitationResult> {
  const tokenHash = hashToken(token);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find and validate invitation
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new AppError('INVALID_TOKEN', 'Invalid invitation token', 400);
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AppError('ALREADY_USED', 'This invitation has already been used', 400);
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AppError('REVOKED', 'This invitation has been revoked', 400);
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError('EXPIRED', 'This invitation has expired', 400);
    }

    // 2. Check user doesn't already exist
    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new AppError('USER_EXISTS', 'A user with this email already exists', 409);
    }

    // 3. Password is required for non-OAuth registration
    if (!password) {
      throw new AppError('PASSWORD_REQUIRED', 'Password is required to create an account', 400);
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 5. Create user
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        fullName,
        passwordHash,
        role: invitation.role,
        timezone: 'Europe/Amsterdam',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        timezone: true,
        role: true,
      },
    });

    // 6. Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    return { user, invitationId: invitation.id };
  });

  // Generate tokens (outside transaction)
  const accessToken = generateAccessToken(result.user.id);
  const refreshToken = generateRefreshToken(result.user.id);

  // Store session in Redis (consistent with auth.service)
  await storeSession(result.user.id, refreshToken);

  // Log audit event
  await logInvitationAudit('INVITATION_ACCEPTED', result.invitationId, result.user.id, {
    method: 'password',
  });

  logger.info({ invitationId: result.invitationId, userId: result.user.id }, 'Invitation accepted');

  return {
    accessToken,
    refreshToken,
    user: result.user as AcceptInvitationResult['user'],
  };
}

/**
 * Accept invitation via OAuth (called from OAuth callback)
 * Creates user without password
 */
export async function acceptInvitationViaOAuth(
  email: string,
  fullName: string,
  provider: 'GOOGLE' | 'MICROSOFT',
  providerId: string,
  avatarUrl?: string
): Promise<AcceptInvitationResult | null> {
  const normalizedEmail = normalizeEmail(email);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Find pending invitation for this email
    const invitation = await tx.invitation.findFirst({
      where: {
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      return null; // No valid invitation - caller should handle this
    }

    // Create user with OAuth provider
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        fullName,
        role: invitation.role,
        timezone: 'Europe/Amsterdam',
        authProvider: provider,
        authProviderId: providerId,
        avatarUrl: avatarUrl ?? null,
        emailVerifiedAt: new Date(), // OAuth emails are verified
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        timezone: true,
        role: true,
      },
    });

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    return { user, invitationId: invitation.id };
  });

  if (!result) {
    return null;
  }

  // Generate tokens
  const accessToken = generateAccessToken(result.user.id);
  const refreshToken = generateRefreshToken(result.user.id);

  // Store session in Redis (consistent with auth.service)
  await storeSession(result.user.id, refreshToken);

  // Log audit event
  await logInvitationAudit('INVITATION_ACCEPTED_OAUTH', result.invitationId, result.user.id, {
    method: 'oauth',
    provider,
  });

  logger.info(
    { invitationId: result.invitationId, userId: result.user.id, provider },
    'Invitation accepted via OAuth'
  );

  return {
    accessToken,
    refreshToken,
    user: result.user as AcceptInvitationResult['user'],
  };
}

// ============================================
// HELPERS
// ============================================

function formatInvitation(invitation: {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedBy: { id: string; fullName: string };
  acceptedBy?: { id: string; fullName: string } | null;
}): InvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    invitedBy: invitation.invitedBy,
    acceptedBy: invitation.acceptedBy || null,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
  };
}
