/**
 * Social Planner - Version Routes
 *
 * API endpoints for post version history.
 */

import { Router } from 'express';
import { requireAuth, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import * as versionService from '../services/version.service';

const router = Router();

// ============================================
// POST VERSIONS (nested under posts)
// ============================================

/**
 * GET /api/posts/:postId/versions
 * Get all versions for a post
 */
router.get('/posts/:postId/versions', requireAuth, async (req, res, next) => {
  try {
    const versions = await versionService.getPostVersions(req.params.postId);
    res.json(versions);
  } catch (error) {
    next(error);
  }
});

// ============================================
// INDIVIDUAL VERSION OPERATIONS
// ============================================

/**
 * GET /api/versions/:id
 * Get a single version
 */
router.get('/versions/:id', requireAuth, async (req, res, next) => {
  try {
    const version = await versionService.getVersionById(req.params.id);
    res.json(version);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/versions/:id/restore
 * Restore a previous version
 */
router.post(
  '/versions/:id/restore',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const result = await versionService.restoreVersion(req.params.id, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
