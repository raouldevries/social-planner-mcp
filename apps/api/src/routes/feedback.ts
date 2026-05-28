/**
 * Social Planner - Feedback Routes
 *
 * API endpoints for in-app feedback submissions and admin management.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  updateFeedbackContentSchema,
  createFeedbackReplySchema,
  paginationSchema,
} from '@social-planner/shared';
import { FEEDBACK_STATUS } from '@social-planner/shared';
import { z } from 'zod';
import * as feedbackService from '../services/feedback.service';

const router = Router();

// Custom rate limiter: 10 submissions per user per hour
const feedbackRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => `ratelimit:feedback:${req.user?.id}`,
});

// Query schema for listing feedback with optional status filter
const feedbackQuerySchema = paginationSchema.extend({
  status: z.enum(Object.values(FEEDBACK_STATUS) as [string, ...string[]]).optional(),
});

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * POST /api/feedback
 * Submit feedback (any authenticated user)
 */
router.post(
  '/',
  requireAuth,
  feedbackRateLimiter,
  validate(createFeedbackSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const feedback = await feedbackService.createFeedback(userId, req.body);
      res.status(201).json(feedback);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/feedback/upload-screenshot
 * Upload a base64-encoded screenshot (any authenticated user)
 */
router.post(
  '/upload-screenshot',
  requireAuth,
  validate(z.object({ imageBase64: z.string().min(1, 'Image data is required') })),
  async (req, res, next) => {
    try {
      const url = await feedbackService.uploadScreenshot(req.body.imageBase64);
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * GET /api/feedback
 * List all feedback (any authenticated user)
 */
router.get('/', requireAuth, validateQuery(feedbackQuerySchema), async (req, res, next) => {
  try {
    const { page, perPage, status } = req.query as any;
    const result = await feedbackService.getFeedbacks({
      status,
      page,
      perPage,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/feedback/:id/content
 * Update feedback content (owner only)
 */
router.patch(
  '/:id/content',
  requireAuth,
  validate(updateFeedbackContentSchema),
  async (req, res, next) => {
    try {
      const feedback = await feedbackService.updateFeedbackContent(
        req.params.id,
        req.user!.id,
        req.body.content
      );
      res.json(feedback);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// REPLY ENDPOINTS
// ============================================

/**
 * GET /api/feedback/:id/replies
 * List replies for a feedback item (any authenticated user)
 */
router.get('/:id/replies', requireAuth, async (req, res, next) => {
  try {
    const replies = await feedbackService.getFeedbackReplies(req.params.id);
    res.json(replies);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/feedback/:id/replies
 * Create a reply on a feedback item (any authenticated user)
 */
router.post(
  '/:id/replies',
  requireAuth,
  validate(createFeedbackReplySchema),
  async (req, res, next) => {
    try {
      const reply = await feedbackService.createFeedbackReply(
        req.params.id,
        req.user!.id,
        req.body.content
      );
      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/feedback/replies/:replyId
 * Delete a reply (author or admin)
 */
router.delete('/replies/:replyId', requireAuth, async (req, res, next) => {
  try {
    await feedbackService.deleteFeedbackReply(
      req.params.replyId,
      req.user!.id,
      req.user!.role === 'ADMIN'
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * PATCH /api/feedback/:id
 * Update feedback status (admin only)
 */
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateFeedbackSchema),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const feedback = await feedbackService.updateFeedbackStatus(req.params.id, status);
      res.json(feedback);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/feedback/:id
 * Delete feedback (admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await feedbackService.deleteFeedback(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
