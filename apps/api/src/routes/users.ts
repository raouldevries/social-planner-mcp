/**
 * Social Planner - User Routes
 *
 * API endpoints for user profile management and admin operations.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { writeRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import * as userService from '../services/user.service';
import { UserRole } from '@social-planner/database';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const deleteAccountSchema = z
  .object({
    password: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.password || data.email, {
    message: 'Either password or email confirmation is required',
  });

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

// ============================================
// PROFILE ENDPOINTS
// ============================================

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
router.patch('/me', writeRateLimiter, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await userService.updateProfile(req.user!.id, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/me/change-password
 * Change current user password
 */
router.post(
  '/me/change-password',
  writeRateLimiter,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      await userService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/me
 * Delete current user account
 * Local users: send { password: "..." }
 * OAuth users: send { email: "..." } to confirm
 */
router.delete('/me', writeRateLimiter, validate(deleteAccountSchema), async (req, res, next) => {
  try {
    const { password, email } = req.body as z.infer<typeof deleteAccountSchema>;

    // Build confirmation object conditionally for exactOptionalPropertyTypes
    const confirmation: { password?: string; email?: string } = {};
    if (password) confirmation.password = password;
    if (email) confirmation.email = email;

    await userService.deleteAccount(req.user!.id, confirmation);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/me/stats
 * Get current user statistics
 */
router.get('/me/stats', async (req, res, next) => {
  try {
    const stats = await userService.getUserStats(req.user!.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================
// TEAM MEMBER ENDPOINTS (all authenticated users)
// ============================================

/**
 * GET /api/users/team-members
 * Get list of team members for collaboration features (all authenticated users)
 * Returns minimal user info for privacy (id, name, avatar, role)
 */
router.get('/team-members', async (req, res, next) => {
  try {
    // Exclude current user from the list
    const teamMembers = await userService.getTeamMembers(req.user!.id);
    res.json(teamMembers);
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', requireAdmin, validateQuery(listUsersSchema), async (req, res, next) => {
  try {
    const { page, perPage, search, role } = req.query as {
      page?: string;
      perPage?: string;
      search?: string;
      role?: string;
    };

    const listOptions: {
      page?: number;
      perPage?: number;
      search?: string;
      role?: UserRole;
    } = {};

    if (page) listOptions.page = parseInt(page);
    if (perPage) listOptions.perPage = parseInt(perPage);
    if (search) listOptions.search = search;
    if (role === 'ADMIN' || role === 'EDITOR' || role === 'VIEWER') {
      listOptions.role = role;
    }

    const result = await userService.listUsers(listOptions);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/role
 * Update user role (admin only)
 */
router.patch(
  '/:id/role',
  requireAdmin,
  writeRateLimiter,
  validate(updateUserRoleSchema),
  async (req, res, next) => {
    try {
      const { role } = req.body as z.infer<typeof updateUserRoleSchema>;
      const user = await userService.updateUserRole(req.params.id, role, req.user!.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', requireAdmin, writeRateLimiter, async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
