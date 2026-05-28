/**
 * Social Planner - Post Routes
 *
 * CRUD operations, status workflow, and scheduling for posts.
 * Single workspace architecture - all users belong to Acme workspace.
 */

import { Router } from 'express';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import {
  createPostSchema,
  updatePostSchema,
  schedulePostSchema,
  rejectPostSchema,
  autosavePostSchema,
  paginationSchema,
  postFiltersSchema,
} from '@social-planner/shared';
import * as postService from '../services/post.service';
import * as channelService from '../services/channel.service';
import { z } from 'zod';

const router = Router();

// All post routes require authentication
router.use(requireAuth);

// ============================================
// POST CRUD
// ============================================

/**
 * GET /api/posts
 * List posts with filtering and pagination
 */
router.get(
  '/',
  validateQuery(paginationSchema.merge(postFiltersSchema)),
  async (req, res, next) => {
    try {
      const { page, perPage, ...filters } = req.query as any;
      const result = await postService.getPosts(filters, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/posts/:id
 * Get post details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const post = await postService.getPostById(req.params.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts
 * Create a new post
 */
router.post(
  '/',
  writeRateLimiter,
  requireEditor,
  validate(createPostSchema),
  async (req, res, next) => {
    try {
      const post = await postService.createPost(req.user!.id, req.body);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/posts/:id
 * Update a post
 */
router.patch(
  '/:id',
  writeRateLimiter,
  requireEditor,
  validate(updatePostSchema),
  async (req, res, next) => {
    try {
      const post = await postService.updatePost(req.params.id, req.user!.id, req.body);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id
 * Delete a post (draft/rejected only, or admin)
 */
router.delete('/:id', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    await postService.deletePost(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATUS WORKFLOW
// ============================================

/**
 * POST /api/posts/:id/submit
 * Submit post for approval
 */
router.post('/:id/submit', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    const post = await postService.submitForApproval(req.params.id, req.user!.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/approve
 * Approve a post (admin only)
 */
router.post('/:id/approve', writeRateLimiter, requireAdmin, async (req, res, next) => {
  try {
    const post = await postService.approvePost(req.params.id, req.user!.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/reject
 * Reject a post (admin only)
 */
router.post(
  '/:id/reject',
  writeRateLimiter,
  requireAdmin,
  validate(rejectPostSchema),
  async (req, res, next) => {
    try {
      const post = await postService.rejectPost(req.params.id, req.user!.id, req.body.reason);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/posts/:id/schedule
 * Schedule a post for publishing
 */
router.post(
  '/:id/schedule',
  writeRateLimiter,
  requireEditor,
  validate(schedulePostSchema),
  async (req, res, next) => {
    try {
      const post = await postService.schedulePost(req.params.id, req.user!.id, req.body);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/posts/:id/unschedule
 * Remove schedule from a post
 */
router.post('/:id/unschedule', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    const post = await postService.unschedulePost(req.params.id, req.user!.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/autosave
 * Autosave post content with conflict detection
 * Returns 409 if the post was modified elsewhere
 */
router.post(
  '/:id/autosave',
  writeRateLimiter,
  requireEditor,
  validate(autosavePostSchema),
  async (req, res, next) => {
    try {
      const result = await postService.autosavePost(req.params.id, req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// COLLABORATORS
// ============================================

/**
 * POST /api/posts/:id/collaborators
 * Add a collaborator to a post
 */
router.post('/:id/collaborators', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
      });
    }
    const post = await postService.addCollaborator(req.params.id, userId, req.user!.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/posts/:id/collaborators/:userId
 * Remove a collaborator from a post
 */
router.delete(
  '/:id/collaborators/:userId',
  writeRateLimiter,
  requireEditor,
  async (req, res, next) => {
    try {
      const post = await postService.removeCollaborator(
        req.params.id,
        req.params.userId,
        req.user!.id
      );
      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// CHANNEL MANAGEMENT (nested under posts)
// ============================================

const addChannelSchema = z.object({
  socialAccountId: z.string().uuid('Invalid social account ID'),
  customContent: z.string().max(5000).optional(),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * GET /api/posts/:id/channels
 * Get all channels for a post
 */
router.get('/:id/channels', async (req, res, next) => {
  try {
    const channels = await channelService.getPostChannels(req.params.id);
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/posts/:id/available-accounts
 * Get social accounts that can be added to this post
 */
router.get('/:id/available-accounts', async (req, res, next) => {
  try {
    const accounts = await channelService.getAvailableAccountsForPost(req.params.id);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/channels
 * Add a channel to a post
 */
router.post(
  '/:id/channels',
  requireEditor,
  writeRateLimiter,
  validate(addChannelSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const channel = await channelService.addChannelToPost(req.params.id, req.body, userId);
      res.status(201).json(channel);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
