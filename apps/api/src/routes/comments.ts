/**
 * Social Planner - Comment Routes
 *
 * API endpoints for post comments with threading support.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import * as commentService from '../services/comment.service';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ============================================
// POST COMMENTS (nested under posts)
// ============================================

/**
 * GET /api/posts/:postId/comments
 * Get all comments for a post (threaded)
 */
router.get('/posts/:postId/comments', requireAuth, async (req, res, next) => {
  try {
    const result = await commentService.getPostComments(req.params.postId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:postId/comments
 * Create a comment on a post
 */
router.post(
  '/posts/:postId/comments',
  requireAuth,
  writeRateLimiter,
  validate(createCommentSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const comment = await commentService.createComment(
        req.params.postId,
        userId,
        req.body
      );
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/posts/:postId/comments/count
 * Get comment counts for a post
 */
router.get('/posts/:postId/comments/count', requireAuth, async (req, res, next) => {
  try {
    const [total, unresolved] = await Promise.all([
      commentService.getCommentCount(req.params.postId),
      commentService.getUnresolvedCount(req.params.postId),
    ]);
    res.json({ total, unresolved });
  } catch (error) {
    next(error);
  }
});

// ============================================
// INDIVIDUAL COMMENT OPERATIONS
// ============================================

/**
 * GET /api/comments/:id
 * Get a single comment
 */
router.get('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    const comment = await commentService.getCommentById(req.params.id);
    res.json(comment);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/comments/:id
 * Update a comment
 */
router.patch(
  '/comments/:id',
  requireAuth,
  writeRateLimiter,
  validate(updateCommentSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { content } = req.body as z.infer<typeof updateCommentSchema>;
      const comment = await commentService.updateComment(req.params.id, userId, content);
      res.json(comment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/comments/:id
 * Delete a comment
 */
router.delete('/comments/:id', requireAuth, writeRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await commentService.deleteComment(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/comments/:id/resolve
 * Toggle resolved status on a comment
 */
router.post(
  '/comments/:id/resolve',
  requireAuth,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const comment = await commentService.toggleResolveComment(req.params.id, userId);
      res.json(comment);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
