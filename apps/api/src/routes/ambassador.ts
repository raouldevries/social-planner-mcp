/**
 * Social Planner - Ambassador Routes
 *
 * API endpoints for ambassador system: groups, memberships, queue, and shares.
 */

import { Router } from 'express';
import { requireAuth, requireEditor } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeRateLimiter } from '../middleware/rateLimiter';
import {
  createAmbassadorGroupSchema,
  updateAmbassadorGroupSchema,
  inviteAmbassadorSchema,
  SOCIAL_PLATFORM,
} from '@social-planner/shared';
import { z } from 'zod';
import * as ambassadorService from '../services/ambassador.service';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const recordShareSchema = z.object({
  postId: z.string().uuid(),
  platform: z.enum([SOCIAL_PLATFORM.INSTAGRAM, SOCIAL_PLATFORM.LINKEDIN]),
  shareUrl: z.string().url().optional(),
});

const respondInvitationSchema = z.object({
  accept: z.boolean(),
});

const bulkInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});

// ============================================
// AMBASSADOR GROUP ROUTES (Admin + Editor)
// ============================================

/**
 * GET /api/ambassador-groups
 * List all ambassador groups
 */
router.get('/ambassador-groups', requireAuth, requireEditor, async (_req, res, next) => {
  try {
    const groups = await ambassadorService.getGroups();
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ambassador-groups
 * Create a new ambassador group
 */
router.post(
  '/ambassador-groups',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(createAmbassadorGroupSchema),
  async (req, res, next) => {
    try {
      const group = await ambassadorService.createGroup(req.body);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ambassador-groups/:id
 * Get a single ambassador group with members
 */
router.get('/ambassador-groups/:id', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const group = await ambassadorService.getGroupById(req.params.id);
    res.json(group);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/ambassador-groups/:id
 * Update an ambassador group
 */
router.patch(
  '/ambassador-groups/:id',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(updateAmbassadorGroupSchema),
  async (req, res, next) => {
    try {
      const group = await ambassadorService.updateGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/ambassador-groups/:id
 * Delete an ambassador group
 */
router.delete(
  '/ambassador-groups/:id',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      await ambassadorService.deleteGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ambassador-groups/:id/test-email
 * Send a test email using the group's template to the current user
 */
router.post(
  '/ambassador-groups/:id/test-email',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const user = req.user!;
      await ambassadorService.sendTestEmail(req.params.id, user.email, user.fullName);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// MEMBERSHIP ROUTES (Admin + Editor)
// ============================================

/**
 * POST /api/ambassador-groups/:id/members
 * Invite a single member to a group
 */
router.post(
  '/ambassador-groups/:id/members',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(inviteAmbassadorSchema),
  async (req, res, next) => {
    try {
      const member = await ambassadorService.inviteMember(req.params.id, req.body.email);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ambassador-groups/:id/members/bulk
 * Bulk invite members to a group
 */
router.post(
  '/ambassador-groups/:id/members/bulk',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(bulkInviteSchema),
  async (req, res, next) => {
    try {
      const result = await ambassadorService.inviteMembers(req.params.id, req.body.emails);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/ambassador-groups/:groupId/members/:memberId
 * Remove a member from a group
 */
router.delete(
  '/ambassador-groups/:groupId/members/:memberId',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      await ambassadorService.removeMember(req.params.groupId, req.params.memberId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// AMBASSADOR USER ROUTES (For ambassadors)
// ============================================

/**
 * GET /api/ambassador/status
 * Check if current user is an active ambassador
 */
router.get('/ambassador/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const isActive = await ambassadorService.isActiveAmbassador(userId);
    const groups = await ambassadorService.getUserGroups(userId);
    res.json({ isActive, groups });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ambassador/invitations
 * Get pending invitations for current user
 */
router.get('/ambassador/invitations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const invitations = await ambassadorService.getPendingInvitations(userId);
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ambassador/invitations/:id/respond
 * Accept or decline an invitation
 */
router.post(
  '/ambassador/invitations/:id/respond',
  requireAuth,
  writeRateLimiter,
  validate(respondInvitationSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const member = await ambassadorService.respondToInvitation(
        userId,
        req.params.id,
        req.body.accept
      );
      res.json(member);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ambassador/queue
 * Get posts available for sharing
 */
router.get('/ambassador/queue', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const posts = await ambassadorService.getAmbassadorQueue(userId);
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ambassador/shares
 * Get current user's share history
 */
router.get('/ambassador/shares', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const shares = await ambassadorService.getAmbassadorShares(userId);
    res.json(shares);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ambassador/stats
 * Get current user's ambassador stats
 */
router.get('/ambassador/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const stats = await ambassadorService.getAmbassadorStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ambassador/shares
 * Record a share
 */
router.post(
  '/ambassador/shares',
  requireAuth,
  writeRateLimiter,
  validate(recordShareSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { postId, platform, shareUrl } = req.body;
      const share = await ambassadorService.recordShare(userId, postId, platform, shareUrl);
      res.status(201).json(share);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST SHARE STATS (For viewing share metrics)
// ============================================

/**
 * GET /api/posts/:postId/shares
 * Get share stats for a post
 */
router.get('/posts/:postId/shares', requireAuth, async (req, res, next) => {
  try {
    const stats = await ambassadorService.getPostShareStats(req.params.postId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
