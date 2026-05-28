/**
 * Social Planner - Scheduler Routes
 *
 * API endpoints for scheduler management and manual publishing triggers.
 * Admin-only access for queue management.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import * as schedulerService from '../services/scheduler.service';
import * as publisherService from '../services/publisher.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// MANUAL PUBLISHING
// ============================================

/**
 * POST /api/scheduler/channels/:channelId/publish
 * Manually trigger publishing for a specific channel
 */
router.post(
  '/channels/:channelId/publish',
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;

      await schedulerService.publishChannelNow(channelId, userId);

      res.json({
        message: 'Channel queued for publishing',
        channelId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/scheduler/posts/:postId/publish
 * Manually trigger publishing for all pending channels on a post
 */
router.post(
  '/posts/:postId/publish',
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      await schedulerService.publishPostNow(postId, userId);

      res.json({
        message: 'Post channels queued for publishing',
        postId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// QUEUE MANAGEMENT (Admin only)
// ============================================

/**
 * GET /api/scheduler/stats
 * Get queue statistics
 */
router.get('/stats', requireAdmin, async (_req, res, next) => {
  try {
    const stats = await schedulerService.getQueueStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scheduler/clear-failed
 * Clear failed jobs from the publishing queue
 */
router.post('/clear-failed', requireAdmin, writeRateLimiter, async (_req, res, next) => {
  try {
    const clearedCount = await schedulerService.clearFailedJobs();
    res.json({
      message: `Cleared ${clearedCount} failed jobs`,
      clearedCount,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PLATFORM INFORMATION
// ============================================

/**
 * GET /api/scheduler/platforms
 * Get list of supported publishing platforms
 */
router.get('/platforms', async (_req, res, next) => {
  try {
    const platforms = publisherService.getSupportedPlatforms();
    res.json({ platforms });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scheduler/validate-content
 * Validate content for a specific platform
 */
router.post('/validate-content', async (req, res, next) => {
  try {
    const { platform, content } = req.body;

    if (!platform || typeof platform !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Platform is required', 400);
    }

    if (!content || typeof content !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Content is required', 400);
    }

    if (!publisherService.isPlatformSupported(platform)) {
      throw new AppError('UNSUPPORTED_PLATFORM', `Platform '${platform}' is not supported`, 400);
    }

    const result = publisherService.validateContent(platform, content);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
