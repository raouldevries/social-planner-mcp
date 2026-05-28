/**
 * Social Planner - Analytics Sync Routes
 *
 * API endpoints for triggering analytics sync operations.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import {
  syncPostAnalytics,
  syncAllAnalytics,
  isSyncEnabled,
} from '../services/analytics-sync.service';
import { logger } from '../lib/logger';

const router = Router();

// All sync routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const postIdSchema = z.object({
  postId: z.string().uuid('Invalid post ID format'),
});

const syncAllBodySchema = z.object({
  platform: z.enum(['LINKEDIN', 'INSTAGRAM']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// ============================================
// SYNC ROUTES
// ============================================

/**
 * GET /api/analytics-sync/status
 * Check if analytics sync is enabled
 */
router.get('/status', (_req, res) => {
  res.json({
    enabled: isSyncEnabled(),
  });
});

/**
 * POST /api/analytics-sync/post/:postId
 * Manually sync analytics for a specific post
 * Requires ADMIN or EDITOR role
 */
router.post('/post/:postId', requireEditor, async (req, res, next) => {
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
    const results = await syncPostAnalytics(postId);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      message: `Synced ${successful} channel(s), ${failed} failed`,
      results,
    });
  } catch (error) {
    logger.error({ error, postId: req.params.postId }, 'Failed to sync post analytics');
    next(error);
  }
});

/**
 * POST /api/analytics-sync/all
 * Trigger a full analytics sync
 * Requires ADMIN role
 */
router.post('/all', requireAdmin, async (req, res, next) => {
  try {
    const bodyResult = syncAllBodySchema.safeParse(req.body);

    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request body',
        details: bodyResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { platform, fromDate, toDate } = bodyResult.data;

    const options: Parameters<typeof syncAllAnalytics>[0] = {};
    if (platform) options.platform = platform;
    if (fromDate) options.fromDate = new Date(fromDate);
    if (toDate) options.toDate = new Date(toDate);

    const result = await syncAllAnalytics(options);

    res.json({
      message: `Analytics sync completed: ${result.synced} synced, ${result.failed} failed, ${result.skipped} skipped`,
      ...result,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to sync all analytics');
    next(error);
  }
});

export default router;
