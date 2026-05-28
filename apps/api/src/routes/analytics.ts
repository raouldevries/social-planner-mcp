/**
 * Social Planner - Analytics Routes
 *
 * API endpoints for analytics data and reporting.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as analyticsService from '../services/analytics.service';
import type { AnalyticsFilters } from '../services/analytics.service';
import { analyticsFiltersSchema } from '@social-planner/shared';
import { z } from 'zod';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * GET /api/analytics
 * Get dashboard analytics with date range filters
 *
 * Query params:
 * - fromDate: date string YYYY-MM-DD (required)
 * - toDate: date string YYYY-MM-DD (required)
 * - platform: 'INSTAGRAM' | 'LINKEDIN' (optional)
 */
router.get('/', async (req, res, next) => {
  try {
    const result = analyticsFiltersSchema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { fromDate, toDate, platform } = result.data;

    const filters: AnalyticsFilters = {
      fromDate,
      toDate,
      ...(platform && { platform }),
    };

    const data = await analyticsService.getDashboardAnalytics(filters);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Extended schema for top-posts with limit
const topPostsFiltersSchema = analyticsFiltersSchema.extend({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * GET /api/analytics/top-posts
 * Get top performing posts within a date range
 *
 * Query params:
 * - fromDate: date string YYYY-MM-DD (required)
 * - toDate: date string YYYY-MM-DD (required)
 * - platform: 'INSTAGRAM' | 'LINKEDIN' (optional)
 * - limit: number (optional, default 10, max 100)
 */
router.get('/top-posts', async (req, res, next) => {
  try {
    const result = topPostsFiltersSchema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { fromDate, toDate, platform, limit } = result.data;

    const filters: AnalyticsFilters = {
      fromDate,
      toDate,
      ...(platform && { platform }),
    };

    const topPosts = await analyticsService.getTopPosts(filters, limit);
    res.json(topPosts);
  } catch (error) {
    next(error);
  }
});

// Schema for post analytics params
const postIdSchema = z.object({
  postId: z.string().uuid('Invalid post ID format'),
});

/**
 * GET /api/analytics/posts/:postId
 * Get analytics for a specific post
 */
router.get('/posts/:postId', async (req, res, next) => {
  try {
    const paramResult = postIdSchema.safeParse(req.params);

    if (!paramResult.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid post ID',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { postId } = paramResult.data;

    const data = await analyticsService.getPostAnalytics(postId);

    if (!data) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No analytics found for this post',
      });
      return;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
