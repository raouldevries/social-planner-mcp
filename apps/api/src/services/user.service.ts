/**
 * Social Planner - User Service
 *
 * Handles user profile management, settings, and admin operations.
 */

import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma, UserRole, AuthProvider } from '@social-planner/database';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  role: UserRole;
  isDemo: boolean;
  authProvider: AuthProvider;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserListResult {
  items: UserListItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// HELPERS
// ============================================

function formatUserProfile(user: {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  role: UserRole;
  isDemo?: boolean;
  authProvider: AuthProvider;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    role: user.role,
    isDemo: user.isDemo ?? false,
    authProvider: user.authProvider,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

function formatUserListItem(user: {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  createdAt: Date;
  lastLoginAt: Date | null;
}): UserListItem {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    authProvider: user.authProvider,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

// ============================================
// PROFILE OPERATIONS
// ============================================

/**
 * Get current user profile
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
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

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  return formatUserProfile(user);
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: {
    fullName?: string;
    timezone?: string;
    avatarUrl?: string | null;
  }
): Promise<UserProfile> {
  // Build update data conditionally to handle exactOptionalPropertyTypes
  const updateData: Prisma.UserUpdateInput = {};

  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }

  if (data.timezone !== undefined) {
    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
    } catch {
      throw new AppError('INVALID_TIMEZONE', 'Invalid timezone', 400);
    }
    updateData.timezone = data.timezone;
  }

  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return formatUserProfile(user);
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, authProvider: true },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Users with OAuth providers cannot change password
  if (user.authProvider !== 'LOCAL') {
    throw new AppError('OAUTH_USER', 'Password cannot be changed for OAuth users', 400);
  }

  // Verify current password
  if (!user.passwordHash) {
    throw new AppError('NO_PASSWORD', 'No password set for this account', 400);
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('INVALID_PASSWORD', 'Current password is incorrect', 401);
  }

  // Hash and update new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all sessions except current (optional security measure)
  // For now, we'll leave sessions intact
}

/**
 * Delete user account
 * For local users: requires password verification
 * For OAuth users: requires email confirmation
 */
export async function deleteAccount(
  userId: string,
  confirmation: { password?: string; email?: string }
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true, authProvider: true, role: true },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Prevent admin deletion (safety check)
  if (user.role === 'ADMIN') {
    throw new AppError(
      'ADMIN_DELETE',
      'Admin accounts cannot be self-deleted. Contact another admin.',
      400
    );
  }

  // Verify deletion authorization based on auth provider
  if (user.authProvider === 'LOCAL') {
    // Local users must verify with password
    if (!confirmation.password) {
      throw new AppError('PASSWORD_REQUIRED', 'Password is required to delete account', 400);
    }

    if (!user.passwordHash) {
      throw new AppError('NO_PASSWORD', 'No password set for this account', 400);
    }

    const isValid = await bcrypt.compare(confirmation.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('INVALID_PASSWORD', 'Password is incorrect', 401);
    }
  } else {
    // OAuth users must confirm by typing their email
    if (!confirmation.email) {
      throw new AppError('EMAIL_REQUIRED', 'Please confirm by entering your email address', 400);
    }

    if (confirmation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new AppError('EMAIL_MISMATCH', 'Email does not match your account', 400);
    }
  }

  // Delete user (cascades to related records)
  await prisma.user.delete({ where: { id: userId } });
}

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * List all users (admin only)
 */
export async function listUsers(options?: {
  page?: number;
  perPage?: number;
  search?: string;
  role?: UserRole;
}): Promise<UserListResult> {
  const page = options?.page ?? 1;
  const perPage = options?.perPage ?? 20;
  const skip = (page - 1) * perPage;

  const where: Prisma.UserWhereInput = {};

  if (options?.search) {
    where.OR = [
      { email: { contains: options.search, mode: 'insensitive' } },
      { fullName: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.role) {
    where.role = options.role;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        authProvider: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return {
    items: users.map(formatUserListItem),
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

/**
 * Get user by ID (admin only)
 */
export async function getUserById(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  return formatUserProfile(user);
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<UserProfile> {
  // Prevent self-demotion
  if (userId === adminId && newRole !== 'ADMIN') {
    throw new AppError('SELF_DEMOTION', 'Cannot demote your own admin role', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      role: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return formatUserProfile(updated);
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string, adminId: string): Promise<void> {
  // Prevent self-deletion
  if (userId === adminId) {
    throw new AppError('SELF_DELETE', 'Cannot delete your own account', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Prevent deleting other admins (extra safety)
  if (user.role === 'ADMIN') {
    throw new AppError('ADMIN_DELETE', 'Cannot delete admin users', 400);
  }

  await prisma.user.delete({ where: { id: userId } });
}

// ============================================
// TEAM MEMBER OPERATIONS (all authenticated users)
// ============================================

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
}

/**
 * Get list of team members for collaboration features.
 * This is accessible to all authenticated users (not just admins).
 * Returns minimal user info (id, name, avatar, role) for privacy.
 */
export async function getTeamMembers(excludeUserId?: string): Promise<TeamMember[]> {
  const where: Prisma.UserWhereInput = {};

  // Optionally exclude a specific user (e.g., current user)
  if (excludeUserId) {
    where.id = { not: excludeUserId };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
    },
    orderBy: { fullName: 'asc' },
  });

  return users;
}

// ============================================
// UTILITY OPERATIONS
// ============================================

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
  postsCreated: number;
  articlesCreated: number;
  mediaUploaded: number;
}> {
  const [postsCreated, articlesCreated, mediaUploaded] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.article.count({ where: { authorId: userId } }),
    prisma.mediaAsset.count({ where: { uploadedById: userId } }),
  ]);

  return {
    postsCreated,
    articlesCreated,
    mediaUploaded,
  };
}
