/**
 * Social Planner - Activity Routes
 *
 * API endpoints for activity logs.
 */

import { Router } from 'express';
import { validateQuery } from '../middleware/validate';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { z } from 'zod';
import * as activityService from '../services/activity.service';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(50),
});

const activityFiltersSchema = z.object({
  postId: z.string().uuid().optional(),
  articleId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// ============================================
// ACTIVITY LOG ROUTES
// ============================================

/**
 * GET /api/activity
 * Get global activity log (Admin only)
 */
router.get(
  '/',
  requireAdmin,
  validateQuery(paginationSchema.merge(activityFiltersSchema)),
  async (req, res, next) => {
    try {
      const { page, perPage, ...filters } = req.query as any;
      const result = await activityService.getActivityLog(filters, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activity/me
 * Get current user's activity
 */
router.get(
  '/me',
  validateQuery(paginationSchema),
  async (req, res, next) => {
    try {
      const { page, perPage } = req.query as any;
      const userId = req.user!.id;
      const result = await activityService.getUserActivity(userId, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/posts/:postId/activity
 * Get activity log for a post
 */
router.get(
  '/posts/:postId',
  validateQuery(paginationSchema),
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { page, perPage } = req.query as any;
      const result = await activityService.getPostActivityLog(postId, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/articles/:articleId/activity
 * Get activity log for an article
 */
router.get(
  '/articles/:articleId',
  validateQuery(paginationSchema),
  async (req, res, next) => {
    try {
      const { articleId } = req.params;
      const { page, perPage } = req.query as any;
      const result = await activityService.getArticleActivityLog(articleId, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
