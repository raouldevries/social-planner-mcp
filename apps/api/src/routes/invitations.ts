/**
 * Social Planner - Invitation Routes
 *
 * API endpoints for invite-only user registration.
 * - Admin routes: Create, list, resend, revoke invitations
 * - Public routes: Validate token, accept invitation
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { rateLimiter, writeRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import * as invitationService from '../services/invitation.service';
import { UserRole, InvitationStatus } from '@social-planner/database';

const router = Router();

// ============================================
// RATE LIMITERS FOR PUBLIC ENDPOINTS
// ============================================

// Stricter rate limiting for public validation endpoint
const validateRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  keyGenerator: (req) => `ratelimit:invitation:validate:${req.ip}`,
});

// Stricter rate limiting for public accept endpoint
const acceptRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  keyGenerator: (req) => `ratelimit:invitation:accept:${req.ip}`,
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
});

const listInvitationsSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']).optional(),
  email: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Password is required for non-OAuth acceptance with full complexity rules
// Aligned with @social-planner/shared acceptInvitationSchema
const acceptInvitationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token before showing accept form
 * Returns masked email to prevent enumeration
 */
router.get('/validate/:token', validateRateLimiter, async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.json({ valid: false, reason: 'invalid' });
    }

    const result = await invitationService.validateInvitationToken(token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept an invitation and create user account
 */
router.post(
  '/:token/accept',
  acceptRateLimiter,
  validate(acceptInvitationSchema),
  async (req, res, next) => {
    try {
      const { token } = req.params;
      const { fullName, password } = req.body;

      if (!token || token.length !== 64) {
        return res.status(400).json({
          code: 'INVALID_TOKEN',
          message: 'Invalid invitation token',
        });
      }

      const result = await invitationService.acceptInvitation(token, fullName, password);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ADMIN ROUTES (Require authentication + admin role)
// ============================================

// All routes below require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * POST /api/invitations
 * Create a new invitation and send email
 */
router.post('/', writeRateLimiter, validate(createInvitationSchema), async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const result = await invitationService.createInvitation(email, role as UserRole, req.user!.id);

    // Don't expose the token in the response
    res.status(201).json(result.invitation);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/invitations
 * List all invitations with optional filtering
 */
router.get('/', validateQuery(listInvitationsSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, unknown>;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    // Build options object, only including defined values
    const options: {
      status?: InvitationStatus;
      email?: string;
      page?: number;
      limit?: number;
    } = { page, limit };

    if (query.status) {
      options.status = query.status as InvitationStatus;
    }
    if (query.email) {
      options.email = query.email as string;
    }

    const result = await invitationService.listInvitations(options);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with a new token and extended expiry
 */
router.post('/:id/resend', writeRateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const invitation = await invitationService.resendInvitation(id, req.user!.id);
    res.json(invitation);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/invitations/:id
 * Revoke a pending invitation
 */
router.delete('/:id', writeRateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const invitation = await invitationService.revokeInvitation(id, req.user!.id);
    res.json(invitation);
  } catch (error) {
    next(error);
  }
});

export default router;
