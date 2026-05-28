/**
 * Social Planner - Share Link Routes
 *
 * Public and authenticated routes for share links.
 * Allows external users to view posts/calendars and leave comments.
 */

import { Router } from 'express';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import {
  createShareLinkSchema,
  verifyShareLinkSchema,
  externalCommentSchema,
} from '@social-planner/shared';
import * as shareLinkService from '../services/sharelink.service';
import { z } from 'zod';

const router = Router();

// ============================================
// AUTHENTICATED ROUTES (Manage share links)
// ============================================

/**
 * POST /api/posts/:id/share-links
 * Create a share link for a specific post
 */
router.post(
  '/posts/:id/share-links',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(createShareLinkSchema),
  async (req, res, next) => {
    try {
      const shareLink = await shareLinkService.createShareLink(req.user!.id, {
        postId: req.params.id,
        ...req.body,
      });
      res.status(201).json(shareLink);
    } catch (error) {
      next(error);
    }
  }
);

// Schema for sending review request email
const sendReviewRequestSchema = z.object({
  recipientEmail: z.string().email(),
  message: z.string().max(1000).optional(),
});

/**
 * POST /api/posts/:id/review-request
 * Create a share link and send a review request email
 */
router.post(
  '/posts/:id/review-request',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(sendReviewRequestSchema),
  async (req, res, next) => {
    try {
      const shareLink = await shareLinkService.sendReviewRequest(req.user!.id, {
        postId: req.params.id,
        recipientEmail: req.body.recipientEmail,
        message: req.body.message,
      });
      res.status(201).json(shareLink);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/posts/:id/share-links
 * List all share links for a post
 */
router.get('/posts/:id/share-links', requireAuth, async (req, res, next) => {
  try {
    const shareLinks = await shareLinkService.listPostShareLinks(req.params.id);
    res.json(shareLinks);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/calendar/share-links
 * Create a share link for calendar view
 */
router.post(
  '/calendar/share-links',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(createShareLinkSchema),
  async (req, res, next) => {
    try {
      const shareLink = await shareLinkService.createShareLink(req.user!.id, {
        calendarShare: true,
        ...req.body,
      });
      res.status(201).json(shareLink);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/share-links
 * List all share links created by current user
 */
router.get('/share-links', requireAuth, async (req, res, next) => {
  try {
    const shareLinks = await shareLinkService.listUserShareLinks(req.user!.id);
    res.json(shareLinks);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/share-links/:id
 * Delete a share link (owner or admin)
 */
router.delete('/share-links/:id', requireAuth, writeRateLimiter, async (req, res, next) => {
  try {
    await shareLinkService.deleteShareLink(req.params.id, req.user!.id, req.user!.role === 'ADMIN');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUBLIC ROUTES (Access shared content)
// ============================================

const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

/**
 * GET /api/share/:token
 * Access shared content (public)
 */
router.get('/share/:token', validateQuery(monthQuerySchema), async (req, res, next) => {
  try {
    const result = await shareLinkService.accessShareLink(
      req.params.token,
      req.query.month as string | undefined
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/share/:token/meta
 * Get share link metadata (check if password required)
 */
router.get('/share/:token/meta', async (req, res, next) => {
  try {
    const meta = await shareLinkService.getShareLinkMeta(req.params.token);
    res.json(meta);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/share/:token/verify
 * Verify password and access shared content
 */
router.post(
  '/share/:token/verify',
  writeRateLimiter,
  validate(verifyShareLinkSchema),
  validateQuery(monthQuerySchema),
  async (req, res, next) => {
    try {
      const result = await shareLinkService.accessShareLinkWithPassword(
        req.params.token,
        req.body.password,
        req.query.month as string | undefined
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/share/:token/comments
 * Add external comment via share link
 */
router.post(
  '/share/:token/comments',
  writeRateLimiter,
  validate(externalCommentSchema),
  async (req, res, next) => {
    try {
      const comment = await shareLinkService.addExternalComment(req.params.token, req.body.postId, {
        name: req.body.name,
        email: req.body.email,
        content: req.body.content,
        parentId: req.body.parentId,
      });
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// Schema for external approval
const externalApprovalSchema = z.object({
  postId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

/**
 * POST /api/share/:token/approve
 * Approve a post via share link (external reviewer)
 */
router.post(
  '/share/:token/approve',
  writeRateLimiter,
  validate(externalApprovalSchema),
  async (req, res, next) => {
    try {
      const result = await shareLinkService.approvePostViaShareLink(
        req.params.token,
        req.body.postId,
        {
          name: req.body.name,
          email: req.body.email,
        }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
