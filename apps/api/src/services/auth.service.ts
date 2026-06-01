/**
 * Social Planner - Auth Service
 *
 * Handles user authentication, registration, and session management.
 * Single workspace architecture - all users belong to Acme workspace.
 */

import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { storeSession, deleteSession, deleteAllUserSessions, SESSION_PREFIX } from '../lib/session';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@social-planner/shared';
import { sendPasswordResetEmail } from './email.service';
import { acceptInvitationViaOAuth } from './invitation.service';

const SALT_ROUNDS = 12;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    timezone: string;
    role: UserRole;
    isDemo?: boolean;
  };
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'An account with this email already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user with default EDITOR role
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      timezone: 'Europe/Amsterdam',
      role: 'EDITOR',
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

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token session
  await storeSession(user.id, refreshToken);

  return { accessToken, refreshToken, user: user as AuthResult['user'] };
}

/**
 * Login user with email and password
 */
export async function loginUser(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      isDemo: true,
      passwordHash: true,
      authProvider: true,
    },
  });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Check if user has a password (might be OAuth-only user)
  if (!user.passwordHash) {
    throw new AppError(
      'OAUTH_ONLY',
      `This account uses ${user.authProvider} login. Please use that method to sign in.`,
      401
    );
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store session
  await storeSession(user.id, refreshToken, userAgent, ipAddress);

  // Remove sensitive fields from response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, authProvider: _ap, ...userWithoutSensitive } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutSensitive as AuthResult['user'],
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired refresh token', 401);
  }

  // Check if session exists
  const sessionKey = `${SESSION_PREFIX}${payload.sub}:${refreshToken}`;
  const sessionExists = await redis.exists(sessionKey);

  if (!sessionExists) {
    throw new AppError('SESSION_EXPIRED', 'Session has expired or been revoked', 401);
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      isDemo: true,
    },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User no longer exists', 401);
  }

  // Delete old session
  await redis.del(sessionKey);

  // Generate new tokens
  const newAccessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  // Store new session
  await storeSession(user.id, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: user as AuthResult['user'],
  };
}

/**
 * Logout user - invalidate session
 */
export async function logoutUser(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    // Delete specific session
    await deleteSession(userId, refreshToken);
  } else {
    // Delete all sessions for user
    await logoutAllSessions(userId);
  }
}

/**
 * Logout all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  await deleteAllUserSessions(userId);
}

/**
 * Verify email address
 */
export async function verifyEmail(token: string): Promise<void> {
  const key = `email_verification:${token}`;
  const userId = await redis.get(key);

  if (!userId) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired verification token', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await redis.del(key);
}

/**
 * Initiate password reset flow
 */
export async function initiatePasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return;
  }

  // Check if user has password (OAuth users can't reset password)
  if (!user.passwordHash) {
    return;
  }

  const token = uuid();
  const key = `password_reset:${token}`;

  // Store token with 1-hour expiry
  await redis.setex(key, 60 * 60, user.id);

  // Send password reset email
  await sendPasswordResetEmail(user.email, token);
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const key = `password_reset:${token}`;
  const userId = await redis.get(key);

  if (!userId) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Delete reset token
  await redis.del(key);

  // Invalidate all existing sessions
  await logoutAllSessions(userId);
}

/**
 * Update user password (when logged in)
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('NO_PASSWORD', 'This account does not have a password set', 400);
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_PASSWORD', 'Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      isDemo: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}

/**
 * Find or create user from OAuth provider
 */
export async function findOrCreateOAuthUser(
  provider: 'GOOGLE' | 'MICROSOFT',
  providerId: string,
  email: string,
  fullName: string,
  avatarUrl?: string | null
): Promise<AuthResult> {
  // Check if user exists with this provider ID
  let user = await prisma.user.findFirst({
    where: {
      authProvider: provider,
      authProviderId: providerId,
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

  if (!user) {
    // Check if user exists with this email (link accounts)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Link OAuth to existing account
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          authProvider: provider,
          authProviderId: providerId,
          avatarUrl: avatarUrl || existingUser.avatarUrl,
          lastLoginAt: new Date(),
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
    } else {
      // INVITE-ONLY: Attempt to accept invitation atomically
      // No pre-check to avoid TOCTOU race condition
      const result = await acceptInvitationViaOAuth(
        email,
        fullName,
        provider,
        providerId,
        avatarUrl ?? undefined
      );

      if (!result) {
        // No pending invitation found
        throw new AppError(
          'NO_INVITATION',
          'Registration is invite-only. Please contact an administrator to request access.',
          403
        );
      }

      return result;
    }
  } else {
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store session
  await storeSession(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: user as AuthResult['user'],
  };
}
